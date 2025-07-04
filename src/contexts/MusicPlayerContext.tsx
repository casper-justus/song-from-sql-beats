import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@clerk/clerk-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { usePlaylistOperations } from '@/hooks/usePlaylistOperations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveMediaUrl, startBackgroundPrefetch, preloadQueue, fetchLyricsContent } from '@/utils/mediaCache';
import { saveUserPreferences, loadUserPreferences } from '@/utils/playerStorage';

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

  // Enhanced URL resolution with mobile optimization
  const resolveMediaUrlWithSession = useCallback(async (
    fileKey: string, 
    isAudioFile: boolean = false, 
    priority: 'high' | 'normal' = 'normal'
  ): Promise<string | null> => {
    return resolveMediaUrl(fileKey, session, isAudioFile, priority);
  }, [session]);

  // Use playlist operations hook
  const playlistOps = usePlaylistOperations();

  // Queue navigation
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

  // Fetch songs with mobile-optimized caching
  const { data: fetchedSongs = [], isLoading: isLoadingSongs, error: songsError } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching songs:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user && !!supabase,
    staleTime: 15 * 60 * 1000, // Increased for mobile
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 20000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always' // Important for mobile network switches
  });

  // Fetch playlists
  const { data: fetchedPlaylists = [] } = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      if (!user || !supabase) return [];
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching playlists:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user && !!supabase,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize with aggressive prefetching
  useEffect(() => {
    if (songsError) console.error("Error in fetchedSongs query:", songsError);
    setSongs(fetchedSongs);
    
    if (fetchedSongs.length > 0 && !isInitialized && session) {
      setIsInitialized(true);
      setQueue(fetchedSongs, 0);
      
      // Start aggressive background prefetching
      startBackgroundPrefetch(fetchedSongs, resolveMediaUrlWithSession, 0)
        .then(() => {
          console.log('Background prefetching completed');
          setPreloadProgress(100);
        })
        .catch(error => {
          console.error('Background prefetching failed:', error);
        });
    }
  }, [fetchedSongs, songsError, resolveMediaUrlWithSession, isInitialized, session]);

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

  // Mobile-optimized queue management with aggressive prefetching
  const setQueue = useCallback((newQueue: Song[], startIndex: number = 0) => {
    setQueueState(newQueue);
    setCurrentQueueIndex(startIndex);
    if (newQueue.length > 0) {
      setCurrentSong(newQueue[startIndex]);
      // Start immediate prefetching for mobile
      setTimeout(() => {
        startBackgroundPrefetch(newQueue, resolveMediaUrlWithSession, startIndex);
      }, 100);
    }
  }, [resolveMediaUrlWithSession]);

  const addToQueue = useCallback((song: Song) => {
    setQueueState(prev => [...prev, song]);
    // Prefetch the newly added song
    const audioFileKey = song.storage_path || song.file_url;
    if (audioFileKey) {
      resolveMediaUrlWithSession(audioFileKey, true, 'normal');
    }
  }, [resolveMediaUrlWithSession]);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      
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
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }
      
      // Auto-play with improved performance
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
              
              // Prefetch next songs
              if (index + 1 < queue.length) {
                startBackgroundPrefetch(queue.slice(index + 1), resolveMediaUrlWithSession, 0);
              }
            }
          } catch (error) {
            console.error('Error playing song from queue:', error);
            setIsPlaying(false);
          }
        }
      }, 50);
    }
  }, [queue, resolveMediaUrlWithSession, audioRef]);

  // Load user preferences
  useEffect(() => {
    const preferences = loadUserPreferences();
    setVolumeState(preferences.volume);
  }, []);

  // Update volume
  useEffect(() => {
    setVolume(volume);
  }, [volume, setVolume]);

  // Enhanced lyrics fetching
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

  // Enhanced song selection with mobile-first approach
  const selectSong = useCallback(async (song: Song) => {
    console.log('Selecting song:', song.title);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    
    setIsPlaying(false);
    setCurrentSong(song);

    const queueIndex = queue.findIndex(s => s.id === song.id);
    if (queueIndex !== -1) {
      setCurrentQueueIndex(queueIndex);
    } else {
      const songIndex = songs.findIndex(s => s.id === song.id);
      if (songIndex !== -1) {
        const newQueue = [...songs.slice(songIndex), ...songs.slice(0, songIndex)];
        setQueue(newQueue, 0);
      }
    }

    // Mobile-optimized auto-play with reduced delay
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
            audioRef.current.preload = 'auto'; // Ensure full preload for smooth playback
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch (error) {
          console.error('Error auto-playing song:', error);
          setIsPlaying(false);
        }
      }
    }, 50); // Reduced delay for better mobile responsiveness
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
    const newVolume = level / 100;
    setVolumeState(newVolume);
    saveUserPreferences(newVolume);
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
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
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
