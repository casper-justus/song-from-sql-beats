import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@clerk/clerk-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { usePlaylistOperations } from '@/hooks/usePlaylistOperations';
import { useNativeAudio } from '@/hooks/useNativeAudio';
import { resolveMediaUrl, startBackgroundPrefetch, preloadQueue, fetchLyricsContent, audioBlobCache } from '@/utils/mediaCache'; // Added audioBlobCache
import { saveUserPreferences, loadUserPreferences } from '@/utils/playerStorage';
import { isSongDownloaded } from '@/utils/offlinePlayback';

type Song = Tables<'songs'> & {
  isDownloaded?: boolean;
  localPath?: string;
  streamUrl?: string;
  artworkUrl?: string;
};
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
  const [volume, setVolumeState] = useState(0.75);
  const [lyrics, setLyrics] = useState('');
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();
  const currentObjectUrlRef = React.useRef<string | null>(null); // To store and revoke blob URLs


  const {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    resume,
    seek,
  } = useNativeAudio({
    onNext: playNext,
    onPrevious: playPrevious,
  });

  const seekTo = (time: number) => {
    if (currentSong) {
      seek(currentSong.id, time);
    }
  };

  // Enhanced URL resolution with mobile optimization
  const resolveMediaUrlWithSession = useCallback(async (
    song: Song,
    isAudioFile: boolean = false,
    priority: 'high' | 'normal' = 'normal'
  ): Promise<string | null> => {
    const localPath = await isSongDownloaded(song.id);
    if (localPath) {
      return localPath;
    }
    const fileKey = song.storage_path || song.file_url;
    if (!fileKey) return null;
    return resolveMediaUrl(fileKey, session, isAudioFile, priority);
  }, [session]);

  // Use playlist operations hook
  const playlistOps = usePlaylistOperations();

  const playFromQueue = useCallback(async (index: number) => {
    if (index < 0 || index >= queue.length) return;
    const song = queue[index];
    setCurrentSong(song);
    setCurrentQueueIndex(index);
    const localPath = await isSongDownloaded(song.id);
    const streamUrl = await resolveMediaUrlWithSession(song, true, 'high');
    const artworkUrl = song.cover_url || '';
    const assetId = song.id;
    if (localPath) {
      play({ ...song, assetId, localPath, streamUrl: localPath, artworkUrl });
    } else if (streamUrl) {
      play({ ...song, assetId, streamUrl, artworkUrl });
    }
  }, [queue, resolveMediaUrlWithSession, play]);

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

    const checkDownloads = async () => {
      const songsWithDownloadStatus = await Promise.all(
        fetchedSongs.map(async (song: Song) => {
          const localPath = await isSongDownloaded(song.id);
          return {
            ...song,
            isDownloaded: !!localPath,
            localPath: localPath || undefined,
          };
        })
      );
      setSongs(songsWithDownloadStatus);

      if (songsWithDownloadStatus.length > 0 && !isInitialized && session) {
        setIsInitialized(true);
        setQueue(songsWithDownloadStatus, 0);

        // Start aggressive background prefetching
        startBackgroundPrefetch(songsWithDownloadStatus, (song) => resolveMediaUrlWithSession(song), 0)
          .then(() => {
            console.log('Background prefetching completed');
            setPreloadProgress(100);
          })
          .catch(error => {
            console.error('Background prefetching failed:', error);
          });
      }
    };

    checkDownloads();
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
    resolveMediaUrlWithSession(song, true, 'normal');
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
      resolveMediaUrlWithSession(song, true, 'high').then(async (url) => {
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
    // setVolume(volume);
  }, [volume]);

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
    if (currentSong) {
      if (isPlaying) {
        pause(currentSong.id);
      } else {
        resume(currentSong.id);
      }
    }
  }, [isPlaying, pause, resume, currentSong]);

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
      playNextInQueue,
      removeFromQueue,
      reorderQueueItem,
      clearQueue,
      seek: seekTo,
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
