import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@clerk/clerk-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { usePlaylistOperations } from '@/hooks/usePlaylistOperations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveMediaUrl, startBackgroundPrefetch, preloadQueue, fetchLyricsContent, audioBlobCache } from '@/utils/mediaCache'; // Added audioBlobCache
import { saveUserPreferences, loadUserPreferences, savePlaybackState, loadPlaybackState } from '@/utils/playerStorage';

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
  createPlaylist: (name: string, description?: string) => Promise<any>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  activePlayerRef: React.RefObject<HTMLAudioElement>;
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

  // Define playback functions before they are used in hooks
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

  const playFromQueue = useCallback(async (index: number, autoPlay = true) => {
    if (index < 0 || index >= queue.length) return;
    const song = queue[index];
    const nextSong = queue[(index + 1) % queue.length];
    setCurrentSong(song);
    setCurrentQueueIndex(index);
    setCurrentTime(0);
    setIsPlaying(autoPlay);
    // Use the activePlayerRef from the useAudioPlayer hook below
  }, [queue]);

  const playNext = useCallback((autoPlay = false) => {
    if (queue.length === 0) return;
    const nextIndex = (currentQueueIndex + 1) % queue.length;
    if (playFromQueue) playFromQueue(nextIndex, autoPlay);
  }, [queue, currentQueueIndex, playFromQueue]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    if (playFromQueue) playFromQueue(prevIndex, true);
  }, [queue, currentQueueIndex, playFromQueue]);

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
    () => playNext(true) // onEnded callback
  );

  // useEffect to load and play audio, now that all functions are defined.
  useEffect(() => {
    const loadAndPlay = async () => {
        if (!currentSong) return;
        if(audioRefA.current) audioRefA.current.pause();
        if(audioRefB.current) audioRefB.current.pause();

        await preloadSong(currentSong, activePlayerRef);
        const nextSong = queue[(currentQueueIndex + 1) % queue.length];
        await preloadSong(nextSong, inactivePlayerRef);

        if (isPlaying && activePlayerRef.current) {
            try {
                await activePlayerRef.current.play();
            } catch (e) {
                console.error("Error playing audio:", e);
                setIsPlaying(false);
            }
        }
    };
    loadAndPlay();
  }, [currentSong, isPlaying, activePlayerRef, inactivePlayerRef, preloadSong, queue, currentQueueIndex]);

  // Fetch songs with mobile-optimized caching
  const { data: fetchedSongs = [], isLoading: isLoadingSongs, error: songsError } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      if (!supabase) return [];
      const localSongs = localStorage.getItem('songs');
      if (localSongs) {
        return JSON.parse(localSongs);
      }
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching songs:", error);
        throw error;
      }
      localStorage.setItem('songs', JSON.stringify(data || []));
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
  }, [fetchedSongs, songsError, resolveMediaUrlWithSession, isInitialized, session, setQueue]);

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


  // Load user preferences and restore playback state
  useEffect(() => {
    if (!isInitialized && songs.length > 0) {
      const preferences = loadUserPreferences();
      setVolumeState(preferences.volume);
      
      // Restore last playback state
      const playbackState = loadPlaybackState();
      if (playbackState?.songId) {
        const lastSong = songs.find(song => song.id === playbackState.songId);
        if (lastSong) {
          console.log(`[Playback Restore] Restoring last played song: ${lastSong.title} at ${Math.floor(playbackState.currentTime)}s`);
          setCurrentSong(lastSong);
          setQueueState([lastSong]);
          setCurrentQueueIndex(0);
          // Set the time after the song loads
          setTimeout(() => {
            if (activePlayerRef.current) {
              activePlayerRef.current.currentTime = playbackState.currentTime;
              setCurrentTime(playbackState.currentTime);
            }
          }, 1000);
        }
      }
      setIsInitialized(true);
    }
  }, [songs, isInitialized, activePlayerRef]);

  // Save playback state periodically and on song changes
  useEffect(() => {
    if (currentSong && currentTime > 0 && duration > 0) {
      // Debounce saving every 5 seconds to avoid too many localStorage writes
      const timeInterval = Math.floor(currentTime / 5) * 5;
      savePlaybackState(currentSong.id, currentTime, duration);
    }
  }, [currentSong?.id, Math.floor(currentTime / 5), duration]);

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
    <div className="pb-24">
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
        activePlayerRef,
      }}>
        {children}
        <audio ref={audioRefA} preload="auto" crossOrigin="anonymous" />
        <audio ref={audioRefB} preload="auto" crossOrigin="anonymous" />
      </MusicPlayerContext.Provider>
    </div>
  );
};

export const useMusicPlayer = (): MusicPlayerContextType => {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
