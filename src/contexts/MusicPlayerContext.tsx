import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { supabase } from '@/integrations/supabase/client'; // supabase instance
import { Database, Tables } from '@/integrations/supabase/types';
import { useAuth } from './AuthContext';

// Assuming SUPABASE_URL is exported or accessible. For now, hardcoding from your client.ts for context.
// In a real app, this should be imported from a config or the Supabase client file if exported.
const SUPABASE_URL_FOR_FUNCTIONS = "https://dqckopgetuodqhgnhhxw.supabase.co";


type Song = Tables<'songs'>;
// It's important that Song type reflects that file_url, cover_url etc. might be KEYS not actual URLs now.
// However, for simplicity, we'll assume they are still named like URLs but contain keys.

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
  isCurrentSongLiked: boolean; // New state for like status
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  selectSong: (song: Song) => void;
  seek: (time: number) => void;
  setVolumeLevel: (level: number) => void;
  setShowLyricsDialog: (show: boolean) => void;
  toggleLikeSong: (songId: string, videoId: string) => Promise<void>; // New function to toggle like
  audioRef: React.RefObject<HTMLAudioElement> | null;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set()); // Stores UUIDs of liked songs
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75); // Store as a number 0-1
  const [lyrics, setLyrics] = useState('');
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [resolvedUrlCache, setResolvedUrlCache] = useState<Record<string, string>>({});
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const queryClient = useQueryClient(); // For potential cache invalidation if needed

  const { session } = useAuth(); // Get session for JWT

  // Helper function to resolve media URL via Edge Function
  const resolveMediaUrl = useCallback(async (fileKey: string): Promise<string | null> => {
    if (!fileKey) return null;
    if (resolvedUrlCache[fileKey]) return resolvedUrlCache[fileKey];
    if (!session?.access_token) {
      console.error("No JWT available for URL resolution.");
      return null; // Or throw error
    }

    setIsResolvingUrl(true);
    try {
      const response = await fetch(`${SUPABASE_URL_FOR_FUNCTIONS}/functions/v1/super-handler?key=${encodeURIComponent(fileKey)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Failed to resolve URL: ${errorData.message || response.statusText}`);
      }
      const data = await response.json(); // Assuming the function returns { "url": "..." }
      if (data && data.url) {
        setResolvedUrlCache(prev => ({ ...prev, [fileKey]: data.url }));
        return data.url;
      }
      throw new Error("Resolved URL not found in function response.");
    } catch (error) {
      console.error("resolveMediaUrl error:", error);
      return null; // Or rethrow/handle error appropriately
    } finally {
      setIsResolvingUrl(false);
    }
  }, [session, resolvedUrlCache]);


  const { data: fetchedSongs = [], isLoading: isLoadingSongs, error: songsError } = useQuery({
    queryKey: ['songs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching songs:", error);
        throw error;
      }
      // Here, data items will have file_url, cover_url etc. as keys, not resolved URLs yet.
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (songsError) console.error("Error in fetchedSongs query:", songsError);
    setSongs(fetchedSongs);
  }, [fetchedSongs, songsError]);

  useEffect(() => {
    const fetchLiked = async () => {
      if (!user) {
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
  }, [user]);

  const isCurrentSongLiked = currentSong ? likedSongIds.has(currentSong.id) : false;

  const toggleLikeSong = async (songId: string, video_id: string) => {
    if (!user || !songId) return;
    const alreadyLiked = likedSongIds.has(songId);
    if (alreadyLiked) {
      const { error } = await supabase.from('user_liked_songs').delete().match({ user_id: user.id, song_id: songId });
      if (error) console.error('Error unliking song:', error);
      else setLikedSongIds(prev => { const next = new Set(prev); next.delete(songId); return next; });
    } else {
      const { error } = await supabase.from('user_liked_songs').insert({ user_id: user.id, song_id: songId, video_id: video_id, liked_at: new Date().toISOString() });
      if (error) console.error('Error liking song:', error);
      else setLikedSongIds(prev => new Set(prev).add(songId));
    }
  };

  // Audio event listeners (no change here for file_url resolution itself, that's in play logic)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handleCanPlay = () => {
        setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => {
        console.error("Audio Element Error:", e);
        setIsPlaying(false);
        // Potentially set an error state here
    });


    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', (e) => console.error("Audio Element Error (removed):", e));
    };
  }, [currentSong]); // Re-attach if currentSong changes, though src is set directly

  // Volume effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Lyrics fetching
  useEffect(() => {
    const fetchLyricsContent = async () => {
      if (!currentSong || !currentSong.lyrics_url) {
        setLyrics('No lyrics available for this song.');
        return;
      }

      // Assuming currentSong.lyrics_url is the KEY for the lyrics file
      const lyricsFileKey = currentSong.lyrics_url;
      setLyrics('Loading lyrics...'); // Initial loading state

      try {
        const resolvedLyricsUrl = await resolveMediaUrl(lyricsFileKey); // Use existing helper

        if (resolvedLyricsUrl) {
          const response = await fetch(resolvedLyricsUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch lyrics content: ${response.statusText}`);
          }
          const text = await response.text();
          setLyrics(text);
        } else {
          throw new Error("Could not resolve lyrics URL.");
        }
      } catch (error) {
        console.error('Error fetching lyrics content:', error);
        setLyrics('Error loading lyrics.');
      }
    };

    if (currentSong) { // Only fetch if there's a current song
        fetchLyricsContent();
    } else {
        setLyrics(''); // Clear lyrics if no current song
    }
  }, [currentSong, resolveMediaUrl]); // Added resolveMediaUrl to dependency array

  const selectSong = useCallback(async (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause(); // Pause current playback
      audioRef.current.currentTime = 0;
      setCurrentTime(0);

      // Resolve URL for the new song immediately if needed for preloading or direct play
      // The actual setting of src and playing will happen in togglePlay or a dedicated play function
      const fileKey = song.file_url; // This is a key
      if (fileKey && !resolvedUrlCache[fileKey]) {
        // Pre-resolve, but don't set src here directly to avoid race conditions with togglePlay
        // Or, togglePlay can be made smarter to only resolve if src is not already the target.
        // For now, selectSong just sets the song, togglePlay handles resolution and src.
        // To ensure audioRef.src is set:
        const resolved = await resolveMediaUrl(fileKey);
        if(resolved && audioRef.current && !isPlaying) { // if not auto-playing, set src for next play
            // audioRef.current.src = resolved; // This might be too eager if user doesn't click play.
            // Let togglePlay handle it.
        }
      } else if (fileKey && resolvedUrlCache[fileKey] && audioRef.current) {
        // If already resolved and not auto-playing, can set src.
        // audioRef.current.src = resolvedUrlCache[fileKey];
      }
    }
  }, [resolvedUrlCache, resolveMediaUrl, isPlaying]);

  // Auto-select first song from the fetched list if no song is currently selected
  useEffect(() => {
    if (!currentSong && songs.length > 0 && !isLoadingSongs) { // Ensure songs are loaded
      selectSong(songs[0]);
    }
  }, [songs, currentSong, selectSong, isLoadingSongs]);


  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentSong || isResolvingUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // If src is not set or different from current song's expected resolved URL
      // (or if we don't have a resolved URL yet for the current key)
      const currentFileKey = currentSong.file_url; // This is now a key
      let resolvedSrc = resolvedUrlCache[currentFileKey];

      if (!resolvedSrc) {
        resolvedSrc = await resolveMediaUrl(currentFileKey);
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
        // Potentially set an error state to show in UI
      }
    }
  }, [isPlaying, currentSong, resolveMediaUrl, resolvedUrlCache, isResolvingUrl]);

  const selectSong = useCallback(async (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause(); // Pause current playback
      audioRef.current.currentTime = 0;
      setCurrentTime(0);

      // Resolve URL for the new song immediately if needed for preloading or direct play
      // The actual setting of src and playing will happen in togglePlay or a dedicated play function
      const fileKey = song.file_url; // This is a key
      if (fileKey && !resolvedUrlCache[fileKey]) {
        // Pre-resolve, but don't set src here directly to avoid race conditions with togglePlay
        // Or, togglePlay can be made smarter to only resolve if src is not already the target.
        // For now, selectSong just sets the song, togglePlay handles resolution and src.
        // To ensure audioRef.src is set:
        const resolved = await resolveMediaUrl(fileKey);
        if(resolved && audioRef.current && !isPlaying) { // if not auto-playing, set src for next play
            // audioRef.current.src = resolved; // This might be too eager if user doesn't click play.
            // Let togglePlay handle it.
        }
      } else if (fileKey && resolvedUrlCache[fileKey] && audioRef.current) {
        // If already resolved and not auto-playing, can set src.
        // audioRef.current.src = resolvedUrlCache[fileKey];
      }
    }
  }, [resolvedUrlCache, resolveMediaUrl, isPlaying]);


  const playNext = useCallback(() => {
    if (!currentSong || songs.length === 0 || isResolvingUrl) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    selectSong(songs[nextIndex]);
    // Consider auto-play next:
    // setIsPlaying(true);
    // if (audioRef.current) audioRef.current.play().catch(e => console.error(e));
  }, [currentSong, songs, selectSong]);

  const playPrevious = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    selectSong(songs[prevIndex]);
    // Consider auto-play previous:
    // setIsPlaying(true);
    // if (audioRef.current) audioRef.current.play().catch(e => console.error(e));
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
      isCurrentSongLiked, // Expose like status
      togglePlay,
      playNext,
      playPrevious,
      selectSong,
      seek,
      setVolumeLevel,
      setShowLyricsDialog,
      toggleLikeSong, // Expose toggle like function
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
