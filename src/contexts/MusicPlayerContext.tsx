import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@clerk/clerk-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { usePlaylistOperations } from '@/hooks/usePlaylistOperations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveMediaUrl, preloadSongs, preloadQueue, fetchLyricsContent } from '@/utils/mediaCache';
import { savePlayerState, loadPlayerState } from '@/utils/playerStorage';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Enhanced URL resolution with priority support
  const resolveMediaUrlWithSession = useCallback(async (
    fileKey: string, 
    isAudioFile: boolean = false, 
    priority: 'high' | 'normal' = 'normal'
  ): Promise<string | null> => {
    return resolveMediaUrl(fileKey, session, isAudioFile, priority);
  }, [session]);

  // Enhanced preloading with current queue position
  const preloadSongsWithSession = useCallback(async (songsToPreload: Song[], currentIndex: number = 0) => {
    await preloadSongs(songsToPreload, resolveMediaUrlWithSession, setPreloadProgress, currentIndex);
  }, [resolveMediaUrlWithSession]);

  // Use playlist operations hook
  const playlistOps = usePlaylistOperations();

  // Playlist operations
  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (currentQueueIndex + 1) % queue.length;
    playFromQueue(nextIndex);
  }, [queue, currentQueueIndex]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    playFromQueue(prevIndex);
  }, [queue, currentQueueIndex]);

  // Use audio player hook
  const { audioRef, seek, setVolume } = useAudioPlayer(
    currentTime,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    playNext
  );

  // Fetch songs
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

  // Fetch playlists
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

  // Update songs and preload with better initialization
  useEffect(() => {
    if (songsError) console.error("Error in fetchedSongs query:", songsError);
    setSongs(fetchedSongs);
    
    // Initialize player state only once when songs are first loaded
    if (fetchedSongs.length > 0 && !isInitialized) {
      setIsInitialized(true);
      
      // Load saved state
      const savedState = loadPlayerState();
      if (savedState && savedState.lastQueue.length > 0) {
        // Restore saved state without autoplay
        setQueueState(savedState.lastQueue);
        setCurrentQueueIndex(savedState.lastQueueIndex);
        const lastSong = savedState.lastQueue[savedState.lastQueueIndex];
        if (lastSong) {
          setCurrentSong(lastSong);
          setVolumeState(savedState.lastVolume);
          // Set progress but don't autoplay
          setTimeout(() => {
            if (audioRef.current && savedState.lastProgress > 0) {
              audioRef.current.currentTime = savedState.lastProgress;
              setCurrentTime(savedState.lastProgress);
            }
          }, 1000);
        }
      } else {
        // Default initialization
        setQueue(fetchedSongs, 0);
      }
      
      // Start preloading after initialization
      preloadSongsWithSession(fetchedSongs.slice(0, 10), 0);
    }
  }, [fetchedSongs, songsError, preloadSongsWithSession, isInitialized, audioRef]);

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
    const result = await playlistOps.toggleLikeSong(songId, videoId, likedSongIds);
    if (result) {
      if (result.action === 'add') {
        setLikedSongIds(prev => new Set(prev).add(songId));
      } else {
        setLikedSongIds(prev => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['likedSongs', user?.id] });
    }
  };

  // Queue management functions
  const setQueue = useCallback((newQueue: Song[], startIndex: number = 0) => {
    setQueueState(newQueue);
    setCurrentQueueIndex(startIndex);
    if (newQueue.length > 0) {
      setCurrentSong(newQueue[startIndex]);
      // Preload with current index for better prioritization
      preloadSongsWithSession(newQueue.slice(startIndex, startIndex + 8), 0);
    }
  }, [preloadSongsWithSession]);

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
      
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }
      
      // Auto-play the selected song with improved error handling
      setTimeout(async () => {
        if (audioRef.current) {
          const audioFileKey = song.storage_path || song.file_url;
          
          try {
            // Check preload queue first, then resolve with high priority
            let resolvedSrc: string | null = null;
            const preloadPromise = preloadQueue.get(song.id);
            if (preloadPromise) {
              resolvedSrc = await preloadPromise;
            }
            
            if (!resolvedSrc) {
              resolvedSrc = await resolveMediaUrlWithSession(audioFileKey, true, 'high');
            }

            if (resolvedSrc && audioRef.current) {
              audioRef.current.src = resolvedSrc;
              await audioRef.current.play();
              setIsPlaying(true);
              
              // Preload next songs in background
              const nextSongs = queue.slice(index + 1, index + 4);
              if (nextSongs.length > 0) {
                preloadSongsWithSession(nextSongs, 0);
              }
            }
          } catch (error) {
            console.error('Error playing song from queue:', error);
            setIsPlaying(false);
          }
        }
      }, 100);
    }
  }, [queue, resolveMediaUrlWithSession, audioRef, preloadSongsWithSession]);

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
  }, [songs, currentSong, setQueue, audioRef]);

  // Save state periodically with improved data
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentSong && currentTime > 0) {
        savePlayerState(currentSong.id, currentTime, volume, queue, currentQueueIndex, isPlaying);
      }
    }, 15000); // Save every 15 seconds instead of 10

    return () => clearInterval(interval);
  }, [currentSong, currentTime, volume, queue, currentQueueIndex, isPlaying]);

  // Update volume when changed
  useEffect(() => {
    setVolume(volume);
  }, [volume, setVolume]);

  // Fetch lyrics using improved fetchLyricsContent
  useEffect(() => {
    const fetchLyricsContentAsync = async () => {
      if (!currentSong || !currentSong.lyrics_url) {
        setLyrics('No lyrics available for this song.');
        return;
      }

      setLyrics('Loading lyrics...');

      try {
        const lyricsContent = await fetchLyricsContent(currentSong.lyrics_url, session);
        setLyrics(lyricsContent);
      } catch (error) {
        console.error('Error fetching lyrics:', error);
        setLyrics('Error loading lyrics. Please try again later.');
      }
    };

    if (currentSong) {
      fetchLyricsContentAsync();
    } else {
      setLyrics('');
    }
  }, [currentSong, session]);

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

    // Auto-play with enhanced error handling
    setTimeout(async () => {
      if (audioRef.current) {
        const audioFileKey = song.storage_path || song.file_url;
        
        try {
          let resolvedSrc: string | null = null;
          const preloadPromise = preloadQueue.get(song.id);
          if (preloadPromise) {
            resolvedSrc = await preloadPromise;
          }
          
          if (!resolvedSrc) {
            resolvedSrc = await resolveMediaUrlWithSession(audioFileKey, true, 'high');
          }

          if (resolvedSrc && audioRef.current) {
            audioRef.current.src = resolvedSrc;
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch (error) {
          console.error('Error auto-playing song:', error);
          setIsPlaying(false);
        }
      }
    }, 150);
  }, [queue, songs, resolveMediaUrlWithSession, setQueue, audioRef]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        const audioFileKey = currentSong.storage_path || currentSong.file_url;
        
        let resolvedSrc: string | null = null;
        const preloadPromise = preloadQueue.get(currentSong.id);
        if (preloadPromise) {
          resolvedSrc = await preloadPromise;
        }
        
        if (!resolvedSrc) {
          resolvedSrc = await resolveMediaUrlWithSession(audioFileKey, true, 'high');
        }

        if (resolvedSrc) {
          if (audioRef.current.src !== resolvedSrc) {
            audioRef.current.src = resolvedSrc;
          }
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      }
    }
  }, [isPlaying, currentSong, resolveMediaUrlWithSession, audioRef]);

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
      createPlaylist: playlistOps.createPlaylist,
      addSongToPlaylist: playlistOps.addSongToPlaylist,
      removeSongFromPlaylist: playlistOps.removeSongFromPlaylist,
      deletePlaylist: playlistOps.deletePlaylist,
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
