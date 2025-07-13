import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@clerk/clerk-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { usePlaylistOperations } from '@/hooks/usePlaylistOperations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveMediaUrl, startBackgroundPrefetch, preloadQueue, fetchLyricsContent, audioBlobCache } from '@/utils/mediaCache'; // Added audioBlobCache
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
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueueItem: (startIndex: number, endIndex: number) => void; // Added for DnD
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
  // audioRef is now managed internally by the new useAudioPlayer hook
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
  const currentObjectUrlRef = React.useRef<string | null>(null); // To store and revoke blob URLs

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

  // Forward-declare functions that will be defined inside a useCallback but are needed for dependency arrays
  const playFromQueueRef = useRef<(index: number, autoPlay?: boolean) => Promise<void>>();
  const playNextRef = useRef<(autoPlay?: boolean) => void>();

  // Use audio player hook
  const {
    audioRefA,
    audioRefB,
    activePlayerRef,
    inactivePlayerRef,
    setActivePlayer,
    seek,
    setVolume,
  } = useAudioPlayer(
    setCurrentTime,
    setDuration,
    () => { if (playNextRef.current) playNextRef.current(true) } // onEnded callback, autoPlay=true
  );

  const preloadSong = useCallback(async (song: Song | null, playerRef: React.RefObject<HTMLAudioElement>) => {
    if (!song || !playerRef.current) return;
    const audioFileKey = song.storage_path || song.file_url;
    if (!audioFileKey) return;

    console.log(`[Gapless] Preloading ${song.title}`);
    let audioSrc = audioBlobCache.get(song.id) ? URL.createObjectURL(audioBlobCache.get(song.id)!) : null;
    if (!audioSrc) {
        audioSrc = await resolveMediaUrlWithSession(audioFileKey, true, 'high');
    }

    if (audioSrc) {
        playerRef.current.src = audioSrc;
        playerRef.current.load();
    }
  }, [resolveMediaUrlWithSession]);

  const playNext = useCallback((autoPlay = false) => {
    if (queue.length === 0) return;

    if(activePlayerRef.current) activePlayerRef.current.pause();

    const nextIndex = (currentQueueIndex + 1) % queue.length;
    const nextSong = queue[nextIndex];

    setCurrentQueueIndex(nextIndex);
    setCurrentSong(nextSong);
    setCurrentTime(0);

    const newActivePlayerKey = activePlayerRef.current === audioRefA.current ? 'B' : 'A';
    setActivePlayer(newActivePlayerKey);
    const playerToPlay = newActivePlayerKey === 'A' ? audioRefA.current : audioRefB.current;

    if (autoPlay && playerToPlay) {
      playerToPlay.play().then(() => setIsPlaying(true)).catch(e => console.error("Error playing next track:", e));
    } else {
      setIsPlaying(false);
    }

    const nextNextIndex = (nextIndex + 1) % queue.length;
    const playerToPreload = newActivePlayerKey === 'A' ? audioRefB.current : audioRefA.current;
    preloadSong(queue[nextNextIndex], { current: playerToPreload });

  }, [queue, currentQueueIndex, activePlayerRef, audioRefA, audioRefB, setActivePlayer, preloadSong]);
  playNextRef.current = playNext;

  const playFromQueue = useCallback(async (index: number, autoPlay = true) => {
    if (index < 0 || index >= queue.length) return;

    if(audioRefA.current) audioRefA.current.pause();
    if(audioRefB.current) audioRefB.current.pause();

    const song = queue[index];
    const nextSong = queue[(index + 1) % queue.length];

    setCurrentSong(song);
    setCurrentQueueIndex(index);
    setCurrentTime(0);
    setIsPlaying(autoPlay);

    await preloadSong(song, activePlayerRef);
    await preloadSong(nextSong, inactivePlayerRef);

    if (autoPlay && activePlayerRef.current) {
        try {
            await activePlayerRef.current.play();
        } catch (e) {
            console.error("Error playing audio from queue:", e);
            setIsPlaying(false);
        }
    }
  }, [queue, activePlayerRef, inactivePlayerRef, preloadSong, audioRefA, audioRefB]);
  playFromQueueRef.current = playFromQueue;

  const playPrevious = useCallback(() => {
     if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    if (playFromQueueRef.current) {
      playFromQueueRef.current(prevIndex, true);
    }
  }, [queue, currentQueueIndex]);

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

  const playNextInQueue = useCallback((song: Song) => {
    setQueueState(prevQueue => {
      const newQueue = [...prevQueue];
      const nextIndex = currentQueueIndex + 1;
      newQueue.splice(nextIndex, 0, song); // Insert song after current one

      // If current song was the last one, and we add after it, the new song is now also last.
      // No change to currentQueueIndex needed as current song continues.
      console.log(`[MusicPlayerContext] Added "${song.title}" to play next. New queue length: ${newQueue.length}`);

      // Aggressively preload this newly inserted "play next" song (URL and Blob)
      const audioFileKey = song.storage_path || song.file_url;
      if (audioFileKey) {
        resolveMediaUrlWithSession(audioFileKey, true, 'high').then(async (url) => {
          if (url) {
            preloadQueue.set(song.id, Promise.resolve(url));
            if (!audioBlobCache.has(song.id)) {
              console.log(`[MusicPlayerContext] playNextInQueue: Attempting to fully preload blob for ${song.title}`);
              try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                const blob = await response.blob();
                audioBlobCache.set(song.id, blob);
                manageAudioBlobCache(song.id); // Manage cache size
                console.log(`[MusicPlayerContext] playNextInQueue: Fully preloaded blob for ${song.title}. Blob cache size: ${audioBlobCache.size}`);
              } catch (blobError) {
                console.warn(`[MusicPlayerContext] playNextInQueue: Failed to fully preload blob for ${song.title}:`, blobError);
              }
            }
          }
        });
      }
      return newQueue;
    });
  }, [currentQueueIndex, resolveMediaUrlWithSession]);

  const reorderQueueItem = useCallback((startIndex: number, endIndex: number) => {
    setQueueState(prevQueue => {
      const newQueue = Array.from(prevQueue);
      const [removed] = newQueue.splice(startIndex, 1);
      newQueue.splice(endIndex, 0, removed);

      // Adjust currentQueueIndex if the currently playing song was moved
      if (startIndex === currentQueueIndex) {
        setCurrentQueueIndex(endIndex);
      } else if (startIndex < currentQueueIndex && endIndex >= currentQueueIndex) {
        setCurrentQueueIndex(prevIndex => prevIndex - 1);
      } else if (startIndex > currentQueueIndex && endIndex <= currentQueueIndex) {
        setCurrentQueueIndex(prevIndex => prevIndex + 1);
      }
      // No need to change currentSong, just its position in the queue
      console.log(`[MusicPlayerContext] Reordered queue. Moved from ${startIndex} to ${endIndex}. New currentQueueIndex: ${currentQueueIndex}`);
      return newQueue;
    });
     // Optionally, re-trigger prefetching based on new order, though startBackgroundPrefetch in playFromQueue handles next items.
     // For simplicity, we'll let the existing prefetch logic catch up when the next song change occurs.
  }, [currentQueueIndex]);


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
        const lyricsContent = await fetchLyricsContent(
          currentSong.title || '',
          currentSong.artist || '',
          currentSong.lyrics_url,
          session
        );
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

  const selectSong = useCallback((song: Song) => {
    const existingQueueIndex = queue.findIndex(s => s.id === song.id);
    if (existingQueueIndex !== -1) {
      playFromQueue(existingQueueIndex);
    } else {
      const newQueue = [...queue, song];
      setQueueState(newQueue);
      playFromQueue(newQueue.length - 1);
    }
  }, [queue, playFromQueue]);

  const togglePlay = useCallback(() => {
    const audio = activePlayerRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.src) {
        audio.play().then(() => setIsPlaying(true)).catch(e => console.error("Error toggling play:", e));
      } else {
        // If no src, selectSong should be used first.
        // Or re-load the current song.
        playFromQueue(currentQueueIndex);
      }
    }
  }, [isPlaying, currentSong, activePlayerRef, playFromQueue, currentQueueIndex]);

  const setVolumeLevel = useCallback((level: number) => {
    const newVolume = level / 100;
    setVolumeState(newVolume);
    saveUserPreferences(newVolume);
  }, [setVolumeState]);

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
      playNextInQueue,
      removeFromQueue,
      reorderQueueItem,
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
    }}>
      {children}
      <audio ref={audioRefA} preload="auto" crossOrigin="anonymous" />
      <audio ref={audioRefB} preload="auto" crossOrigin="anonymous" />
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
