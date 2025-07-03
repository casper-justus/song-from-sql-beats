import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@clerk/clerk-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';

type Song = Tables<'songs'>;
type Playlist = Tables<'playlists'>;

interface MusicPlayerContextType {
  songs: Song[];
  currentSong: Song | null;
  queue: Song[];
  currentQueueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoadingSongs: boolean;
  lyrics: string;
  showLyricsDialog: boolean;
  showQueueDialog: boolean;
  isCurrentSongLiked: boolean;
  likedSongIds: Set<string>;
  playlists: Playlist[];
  preloadProgress: number;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  selectSong: (song: Song) => void;
  playFromQueue: (index: number) => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  seek: (time: number) => void;
  setVolumeLevel: (level: number) => void;
  setShowLyricsDialog: (show: boolean) => void;
  setShowQueueDialog: (show: boolean) => void;
  toggleLikeSong: (songId: string, videoId: string) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  audioRef: React.RefObject<HTMLAudioElement> | null;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

// Enhanced global cache for resolved media URLs with expiration
const globalMediaCache = new Map<string, { url: string; expires: number }>();
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes

// Preload queue for faster access
const preloadQueue = new Map<string, Promise<string | null>>();

/**
 * Constructs the proper R2 key for music files by adding the 'music/' prefix
 */
function constructMusicR2Key(storagePath: string): string {
  if (storagePath.startsWith('music/')) {
    return storagePath;
  }
  return `music/${storagePath}`;
}

/**
 * Save player state to localStorage
 */
function savePlayerState(songId: string, currentTime: number, volume: number, queue: Song[], queueIndex: number) {
  try {
    localStorage.setItem('musicPlayer_state', JSON.stringify({
      lastSongId: songId,
      lastProgress: currentTime,
      lastVolume: volume,
      lastQueue: queue,
      lastQueueIndex: queueIndex,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save player state:', error);
  }
}

/**
 * Load player state from localStorage
 */
function loadPlayerState(): { 
  lastSongId: string | null; 
  lastProgress: number; 
  lastVolume: number; 
  lastQueue: Song[]; 
  lastQueueIndex: number; 
} | null {
  try {
    const saved = localStorage.getItem('musicPlayer_state');
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    // Only restore if saved within last 24 hours
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('musicPlayer_state');
      return null;
    }
    
    return {
      lastSongId: state.lastSongId,
      lastProgress: state.lastProgress || 0,
      lastVolume: state.lastVolume || 0.75,
      lastQueue: state.lastQueue || [],
      lastQueueIndex: state.lastQueueIndex || 0
    };
  } catch (error) {
    console.error('Failed to load player state:', error);
    return null;
  }
}

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { session } = useSession();
  const { supabase } = useClerkSupabase();
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [lyrics, setLyrics] = useState('');
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const queryClient = useQueryClient();

  // Enhanced URL resolution with better caching
  const resolveMediaUrl = useCallback(async (fileKey: string, isAudioFile: boolean = false): Promise<string | null> => {
    if (!fileKey) return null;
    
    // Check cache first
    const cached = globalMediaCache.get(fileKey);
    if (cached && Date.now() < cached.expires) {
      return cached.url;
    }
    
    if (!session) {
      console.error("No session available for URL resolution.");
      return null;
    }

    try {
      const r2Key = isAudioFile ? constructMusicR2Key(fileKey) : fileKey;
      
      const token = await session.getToken({
        template: 'supabase'
      });
      
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to resolve URL: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.signedUrl) {
        globalMediaCache.set(fileKey, {
          url: data.signedUrl,
          expires: Date.now() + CACHE_DURATION
        });
        return data.signedUrl;
      }
      throw new Error("Resolved URL not found in function response.");
    } catch (error) {
      console.error("resolveMediaUrl error:", error);
      return null;
    }
  }, [session]);

  // Preload multiple songs efficiently
  const preloadSongs = useCallback(async (songsToPreload: Song[]) => {
    const preloadPromises = songsToPreload.map(async (song, index) => {
      const audioFileKey = song.storage_path || song.file_url;
      if (!audioFileKey || preloadQueue.has(song.id)) return;

      const preloadPromise = resolveMediaUrl(audioFileKey, true);
      preloadQueue.set(song.id, preloadPromise);

      try {
        const resolvedUrl = await preloadPromise;
        if (resolvedUrl) {
          // Preload the audio metadata
          const audio = new Audio();
          audio.preload = 'metadata';
          audio.src = resolvedUrl;
          
          setPreloadProgress(((index + 1) / songsToPreload.length) * 100);
        }
      } catch (error) {
        console.error('Error preloading song:', song.title, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    setPreloadProgress(100);
  }, [resolveMediaUrl]);

  const { data: fetchedSongs = [], isLoading: isLoadingSongs, error: songsError } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching songs:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user && !!supabase,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const { data: fetchedPlaylists = [] } = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      if (!user || !supabase) return [];
      const { data, error } = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching playlists:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user && !!supabase,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (songsError) console.error("Error in fetchedSongs query:", songsError);
    setSongs(fetchedSongs);
    
    // Preload first 10 songs when songs are loaded
    if (fetchedSongs.length > 0) {
      preloadSongs(fetchedSongs.slice(0, 10));
    }
  }, [fetchedSongs, songsError, preloadSongs]);

  useEffect(() => {
    setPlaylists(fetchedPlaylists);
  }, [fetchedPlaylists]);

  // Fetch liked songs
  useEffect(() => {
    const fetchLiked = async () => {
      if (!user || !supabase) {
        setLikedSongIds(new Set());
        return;
      }
      const { data, error } = await supabase
        .from('user_liked_songs')
        .select('song_id')
        .eq('user_id', user.id);
      if (error) console.error('Error fetching liked songs:', error);
      else setLikedSongIds(new Set(data.map(like => like.song_id)));
    };

    fetchLiked();
  }, [user, supabase]);

  const isCurrentSongLiked = currentSong ? likedSongIds.has(currentSong.id) : false;

  const toggleLikeSong = async (songId: string, videoId: string) => {
    if (!user || !songId || !supabase) return;
    
    const isLiked = likedSongIds.has(songId);
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_liked_songs')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', songId);
        
        if (error) throw error;
        
        setLikedSongIds(prev => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('user_liked_songs')
          .insert({
            user_id: user.id,
            song_id: songId,
            liked_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        setLikedSongIds(prev => new Set(prev).add(songId));
      }
      
      queryClient.invalidateQueries({ queryKey: ['likedSongs', user.id] });
    } catch (error) {
      console.error('Error in toggleLikeSong:', error);
    }
  };

  const createPlaylist = async (name: string, description?: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlists').insert({
      user_id: user.id,
      name,
      description: description || null
    });
    if (error) {
      console.error('Error creating playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlists', user.id] });
    }
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlist_songs').insert({
      playlist_id: playlistId,
      song_id: songId
    });
    if (error) {
      console.error('Error adding song to playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistId] });
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlist_songs')
      .delete()
      .match({ playlist_id: playlistId, song_id: songId });
    if (error) {
      console.error('Error removing song from playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistId] });
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    if (error) {
      console.error('Error deleting playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlists', user.id] });
    }
  };

  // Queue management functions
  const setQueue = useCallback((newQueue: Song[], startIndex: number = 0) => {
    setQueueState(newQueue);
    setCurrentQueueIndex(startIndex);
    if (newQueue.length > 0) {
      setCurrentSong(newQueue[startIndex]);
      // Preload next few songs in queue
      const songsToPreload = newQueue.slice(startIndex, startIndex + 5);
      preloadSongs(songsToPreload);
    }
  }, [preloadSongs]);

  const addToQueue = useCallback((song: Song) => {
    setQueueState(prev => [...prev, song]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      
      // Adjust current index if needed
      if (index < currentQueueIndex) {
        setCurrentQueueIndex(prev => prev - 1);
      } else if (index === currentQueueIndex && newQueue.length > 0) {
        const nextIndex = Math.min(currentQueueIndex, newQueue.length - 1);
        setCurrentQueueIndex(nextIndex);
        setCurrentSong(newQueue[nextIndex]);
      }
      
      return newQueue;
    });
  }, [currentQueueIndex]);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    setCurrentQueueIndex(0);
  }, []);

  const playFromQueue = useCallback(async (index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentQueueIndex(index);
      const song = queue[index];
      setCurrentSong(song);
      
      // Auto-play the selected song
      setTimeout(async () => {
        if (audioRef.current) {
          const audioFileKey = song.storage_path || song.file_url;
          
          // Check preload queue first
          let resolvedSrc: string | null = null;
          const preloadPromise = preloadQueue.get(song.id);
          if (preloadPromise) {
            resolvedSrc = await preloadPromise;
          } else {
            resolvedSrc = await resolveMediaUrl(audioFileKey, true);
          }

          if (resolvedSrc && audioRef.current) {
            try {
              audioRef.current.src = resolvedSrc;
              await audioRef.current.play();
              setIsPlaying(true);
            } catch (error) {
              console.error('Error playing song from queue:', error);
              setIsPlaying(false);
            }
          }
        }
      }, 100);
    }
  }, [queue, resolveMediaUrl]);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadPlayerState();
    if (savedState && songs.length > 0) {
      setVolumeState(savedState.lastVolume);
      if (savedState.lastQueue.length > 0) {
        setQueueState(savedState.lastQueue);
        setCurrentQueueIndex(savedState.lastQueueIndex);
        const lastSong = songs.find(s => s.id === savedState.lastSongId);
        if (lastSong) {
          setCurrentSong(lastSong);
          setTimeout(() => {
            if (audioRef.current && savedState.lastProgress > 0) {
              audioRef.current.currentTime = savedState.lastProgress;
              setCurrentTime(savedState.lastProgress);
            }
          }, 500);
        }
      }
    } else if (!currentSong && songs.length > 0) {
      // Default to first song and create initial queue
      setQueue(songs, 0);
    }
  }, [songs, currentSong]);

  // Save state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentSong && currentTime > 0) {
        savePlayerState(currentSong.id, currentTime, volume, queue, currentQueueIndex);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentSong, currentTime, volume, queue, currentQueueIndex]);

  const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handleCanPlay = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => {
      console.error("Audio Element Error:", e);
      setIsPlaying(false);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', (e) => console.error("Audio Element Error (removed):", e));
    };
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const fetchLyricsContent = async () => {
      if (!currentSong || !currentSong.lyrics_url) {
        setLyrics('No lyrics available for this song.');
        return;
      }

      const lyricsFileKey = currentSong.lyrics_url;
      setLyrics('Loading lyrics...');

      try {
        const resolvedLyricsUrl = await resolveMediaUrl(lyricsFileKey, false);
        if (resolvedLyricsUrl) {
          const response = await fetch(resolvedLyricsUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch lyrics content: ${response.statusText}`);
          }
          const text = await response.text();
          setLyrics(text || 'No lyrics content found.');
        } else {
          throw new Error("Could not resolve lyrics URL.");
        }
      } catch (error) {
        console.error('Error fetching lyrics content:', error);
        setLyrics('Error loading lyrics.');
      }
    };

    if (currentSong) {
      fetchLyricsContent();
    } else {
      setLyrics('');
    }
  }, [currentSong, resolveMediaUrl]);

  // Enhanced selectSong function
  const selectSong = useCallback(async (song: Song) => {
    console.log('Selecting song:', song.title);
    
    // Stop current audio and reset
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    
    setIsPlaying(false);
    setCurrentSong(song);

    // Update queue index if song is in current queue
    const queueIndex = queue.findIndex(s => s.id === song.id);
    if (queueIndex !== -1) {
      setCurrentQueueIndex(queueIndex);
    } else {
      // Create new queue starting from selected song
      const songIndex = songs.findIndex(s => s.id === song.id);
      if (songIndex !== -1) {
        const newQueue = [...songs.slice(songIndex), ...songs.slice(0, songIndex)];
        setQueue(newQueue, 0);
      }
    }

    // Auto-play the selected song
    setTimeout(async () => {
      if (audioRef.current) {
        const audioFileKey = song.storage_path || song.file_url;
        
        // Check preload queue first
        let resolvedSrc: string | null = null;
        const preloadPromise = preloadQueue.get(song.id);
        if (preloadPromise) {
          resolvedSrc = await preloadPromise;
        } else {
          resolvedSrc = await resolveMediaUrl(audioFileKey, true);
        }

        if (resolvedSrc && audioRef.current) {
          try {
            audioRef.current.src = resolvedSrc;
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (error) {
            console.error('Error auto-playing song:', error);
            setIsPlaying(false);
          }
        }
      }
    }, 100);
  }, [queue, songs, resolveMediaUrl, setQueue]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const audioFileKey = currentSong.storage_path || currentSong.file_url;
      
      // Check preload queue first
      let resolvedSrc: string | null = null;
      const preloadPromise = preloadQueue.get(currentSong.id);
      if (preloadPromise) {
        resolvedSrc = await preloadPromise;
      } else {
        resolvedSrc = await resolveMediaUrl(audioFileKey, true);
      }

      if (resolvedSrc) {
        if (audioRef.current.src !== resolvedSrc) {
          audioRef.current.src = resolvedSrc;
        }
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
        }
      }
    }
  }, [isPlaying, currentSong, resolveMediaUrl]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (currentQueueIndex + 1) % queue.length;
    playFromQueue(nextIndex);
  }, [queue, currentQueueIndex, playFromQueue]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    playFromQueue(prevIndex);
  }, [queue, currentQueueIndex, playFromQueue]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolumeLevel = useCallback((level: number) => {
    setVolumeState(level / 100);
  }, []);

  return (
    <MusicPlayerContext.Provider value={{
      songs,
      currentSong,
      queue,
      currentQueueIndex,
      isPlaying,
      currentTime,
      duration,
      volume: volume * 100,
      isLoadingSongs,
      lyrics,
      showLyricsDialog,
      showQueueDialog,
      isCurrentSongLiked,
      likedSongIds,
      playlists,
      preloadProgress,
      togglePlay,
      playNext,
      playPrevious,
      selectSong,
      playFromQueue,
      setQueue,
      addToQueue,
      removeFromQueue,
      clearQueue,
      seek,
      setVolumeLevel,
      setShowLyricsDialog,
      setShowQueueDialog,
      toggleLikeSong,
      createPlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      deletePlaylist,
      audioRef
    }}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = (): MusicPlayerContextType => {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
