
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
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoadingSongs: boolean;
  lyrics: string;
  showLyricsDialog: boolean;
  isCurrentSongLiked: boolean;
  likedSongIds: Set<string>;
  playlists: Playlist[];
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  selectSong: (song: Song) => void;
  seek: (time: number) => void;
  setVolumeLevel: (level: number) => void;
  setShowLyricsDialog: (show: boolean) => void;
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
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes (R2 signed URLs are valid for 1 hour)

// Preload cache for next songs
const preloadCache = new Map<string, string>();

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
function savePlayerState(songId: string, currentTime: number, volume: number) {
  try {
    localStorage.setItem('musicPlayer_state', JSON.stringify({
      lastSongId: songId,
      lastProgress: currentTime,
      lastVolume: volume,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save player state:', error);
  }
}

/**
 * Load player state from localStorage
 */
function loadPlayerState(): { lastSongId: string | null; lastProgress: number; lastVolume: number } | null {
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
      lastVolume: state.lastVolume || 0.75
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
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [lyrics, setLyrics] = useState('');
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const queryClient = useQueryClient();

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadPlayerState();
    if (savedState) {
      setVolumeState(savedState.lastVolume);
    }
  }, []);

  // Save state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentSong && currentTime > 0) {
        savePlayerState(currentSong.id, currentTime, volume);
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [currentSong, currentTime, volume]);

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
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`Failed to resolve URL: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.signedUrl) {
        // Cache with expiration
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

  // Preload next song's audio URL
  const preloadNextSong = useCallback(async (song: Song) => {
    if (!song || preloadCache.has(song.id)) return;
    
    try {
      const audioFileKey = song.storage_path || song.file_url;
      const resolvedUrl = await resolveMediaUrl(audioFileKey, true);
      if (resolvedUrl) {
        preloadCache.set(song.id, resolvedUrl);
        // Preload the audio
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = resolvedUrl;
      }
    } catch (error) {
      console.error('Error preloading song:', error);
    }
  }, [resolveMediaUrl]);

  // Fetch songs with better error handling
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch playlists with better caching
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (songsError) console.error("Error in fetchedSongs query:", songsError);
    setSongs(fetchedSongs);
  }, [fetchedSongs, songsError]);

  useEffect(() => {
    setPlaylists(fetchedPlaylists);
  }, [fetchedPlaylists]);

  // Fetch liked songs with better caching
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

  // Fixed toggle like song with proper error handling
  const toggleLikeSong = async (songId: string, videoId: string) => {
    if (!user || !songId || !supabase) return;
    
    const isLiked = likedSongIds.has(songId);
    console.log('Toggling like for song:', songId, 'Currently liked:', isLiked);
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_liked_songs')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', songId);
        
        if (error) {
          console.error('Error unliking song:', error);
          throw error;
        }
        
        setLikedSongIds(prev => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
        console.log('Song unliked successfully');
      } else {
        const { error } = await supabase
          .from('user_liked_songs')
          .insert({
            user_id: user.id,
            song_id: songId,
            liked_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error liking song:', error);
          throw error;
        }
        
        setLikedSongIds(prev => new Set(prev).add(songId));
        console.log('Song liked successfully');
      }
      
      // Refresh liked songs data
      queryClient.invalidateQueries({ queryKey: ['likedSongs', user.id] });
    } catch (error) {
      console.error('Error in toggleLikeSong:', error);
    }
  };

  // Playlist functions
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
      // Invalidate playlist queries to refresh data
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
      // Invalidate playlist queries to refresh data
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

  // Audio event listeners
  useEffect(() => {
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

  // Volume effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Enhanced lyrics fetching
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

  // Fixed selectSong function to properly handle different songs
  const selectSong = useCallback(async (song: Song) => {
    console.log('Selecting song:', song.title, 'ID:', song.id);
    
    // Stop current audio and reset
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    
    setIsPlaying(false);
    setCurrentSong(song);

    // Preload next song
    const currentIndex = songs.findIndex(s => s.id === song.id);
    if (currentIndex !== -1 && currentIndex < songs.length - 1) {
      preloadNextSong(songs[currentIndex + 1]);
    }

    // Auto-play the selected song after a short delay
    setTimeout(async () => {
      console.log('Auto-playing selected song:', song.title);
      if (audioRef.current && currentSong?.id === song.id) {
        const audioFileKey = song.storage_path || song.file_url;
        
        // Check preload cache first
        let resolvedSrc = preloadCache.get(song.id);
        
        if (!resolvedSrc) {
          // Check main cache
          const cached = globalMediaCache.get(audioFileKey);
          if (cached && Date.now() < cached.expires) {
            resolvedSrc = cached.url;
          }
        }

        if (!resolvedSrc) {
          setIsResolvingUrl(true);
          resolvedSrc = await resolveMediaUrl(audioFileKey, true);
          setIsResolvingUrl(false);
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
    }, 200);
  }, [songs, preloadNextSong, resolveMediaUrl, currentSong]);

  // Auto-select first song or restore last played song
  useEffect(() => {
    if (!currentSong && songs.length > 0 && !isLoadingSongs) {
      const savedState = loadPlayerState();
      if (savedState && savedState.lastSongId) {
        const lastSong = songs.find(s => s.id === savedState.lastSongId);
        if (lastSong) {
          setCurrentSong(lastSong);
          setTimeout(() => {
            if (audioRef.current && savedState.lastProgress > 0) {
              audioRef.current.currentTime = savedState.lastProgress;
              setCurrentTime(savedState.lastProgress);
            }
          }, 500);
          return;
        }
      }
      setCurrentSong(songs[0]);
    }
  }, [songs, currentSong, isLoadingSongs]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentSong || isResolvingUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const audioFileKey = currentSong.storage_path || currentSong.file_url;
      
      // Check preload cache first
      let resolvedSrc = preloadCache.get(currentSong.id);
      
      if (!resolvedSrc) {
        // Check main cache
        const cached = globalMediaCache.get(audioFileKey);
        if (cached && Date.now() < cached.expires) {
          resolvedSrc = cached.url;
        }
      }

      if (!resolvedSrc) {
        setIsResolvingUrl(true);
        resolvedSrc = await resolveMediaUrl(audioFileKey, true);
        setIsResolvingUrl(false);
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
      } else {
        console.error("Could not resolve audio URL for playback.");
        setIsPlaying(false);
      }
    }
  }, [isPlaying, currentSong, resolveMediaUrl, isResolvingUrl]);

  // Fixed playNext to select the correct next song
  const playNext = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    const nextSong = songs[nextIndex];
    console.log('Playing next song:', nextSong.title, 'Current index:', currentIndex, 'Next index:', nextIndex);
    selectSong(nextSong);
  }, [currentSong, songs, selectSong]);

  // Fixed playPrevious to select the correct previous song
  const playPrevious = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    const prevSong = songs[prevIndex];
    console.log('Playing previous song:', prevSong.title, 'Current index:', currentIndex, 'Prev index:', prevIndex);
    selectSong(prevSong);
  }, [currentSong, songs, selectSong]);

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
      isPlaying,
      currentTime,
      duration,
      volume: volume * 100,
      isLoadingSongs,
      lyrics,
      showLyricsDialog,
      isCurrentSongLiked,
      likedSongIds,
      playlists,
      togglePlay,
      playNext,
      playPrevious,
      selectSong,
      seek,
      setVolumeLevel,
      setShowLyricsDialog,
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
