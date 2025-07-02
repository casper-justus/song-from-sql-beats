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

/**
 * Extracts the R2 object key from a full Cloudflare R2 public URL.
 * Assumes the URL format: https://[account_id].r2.cloudflarestorage.com/[bucket_name]/[object_key]
 * This function handles URL-encoded characters.
 *
 * @param {string} fullR2Url The complete R2 public URL.
 * @returns {string|null} The R2 object key (e.g., "music/music/song.mp3") or null if invalid format.
 */
function extractR2KeyFromUrl(fullR2Url: string): string | null {
  try {
    const url = new URL(fullR2Url);
    // The pathname will be something like "/[bucket_name]/[object_key]"
    // We remove the leading slash to get the R2 object key.
    let path = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    return decodeURIComponent(path); // Decode any URL-encoded characters (e.g., %20 to space)
  } catch (error) {
    console.error("Failed to parse R2 URL for key extraction in Edge Function:", fullR2Url, error);
    return null; // Return null if the URL is invalid or cannot be parsed
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
  const [resolvedUrlCache, setResolvedUrlCache] = useState<Record<string, string>>({});
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const queryClient = useQueryClient();

  // Helper function to resolve media URL via Edge Function with proper RS256 token
  const resolveMediaUrl = useCallback(async (fileKey: string): Promise<string | null> => {
    if (!fileKey) return null;
    if (resolvedUrlCache[fileKey]) return resolvedUrlCache[fileKey];
    if (!session) {
      console.error("No session available for URL resolution.");
      return null;
    }

    setIsResolvingUrl(true);
    try {
      // Extract R2 key from the full URL if needed
      const r2Key = extractR2KeyFromUrl(fileKey) || fileKey;
      
      // Get the Clerk JWT token with RS256 format using the supabase template
      const token = await session.getToken({
        template: 'supabase'
      });
      
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      console.log('Using RS256 token for R2 signing request');
      const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`Failed to resolve URL: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      if (data && data.url) {
        setResolvedUrlCache(prev => ({ ...prev, [fileKey]: data.url }));
        return data.url;
      }
      throw new Error("Resolved URL not found in function response.");
    } catch (error) {
      console.error("resolveMediaUrl error:", error);
      return null;
    } finally {
      setIsResolvingUrl(false);
    }
  }, [session, resolvedUrlCache]);

  // Fetch songs - now accessible to all authenticated users
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
  });

  useEffect(() => {
    if (songsError) console.error("Error in fetchedSongs query:", songsError);
    setSongs(fetchedSongs);
  }, [fetchedSongs, songsError]);

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

  // Toggle like song
  const toggleLikeSong = async (songId: string, video_id: string) => {
    if (!user || !songId || !supabase) return;
    const alreadyLiked = likedSongIds.has(songId);
    if (alreadyLiked) {
      const { error } = await supabase.from('user_liked_songs').delete().match({ user_id: user.id, song_id: songId });
      if (error) console.error('Error unliking song:', error);
      else setLikedSongIds(prev => { const next = new Set(prev); next.delete(songId); return next; });
    } else {
      const { error } = await supabase.from('user_liked_songs').insert({ 
        user_id: user.id, 
        song_id: songId, 
        video_id: video_id, 
        liked_at: new Date().toISOString() 
      });
      if (error) console.error('Error liking song:', error);
      else setLikedSongIds(prev => new Set(prev).add(songId));
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
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlist_songs')
      .delete()
      .match({ playlist_id: playlistId, song_id: songId });
    if (error) {
      console.error('Error removing song from playlist:', error);
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

  // Lyrics fetching
  useEffect(() => {
    const fetchLyricsContent = async () => {
      if (!currentSong || !currentSong.lyrics_url) {
        setLyrics('No lyrics available for this song.');
        return;
      }

      const lyricsFileKey = currentSong.lyrics_url;
      setLyrics('Loading lyrics...');

      try {
        const resolvedLyricsUrl = await resolveMediaUrl(lyricsFileKey);
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

    if (currentSong) {
      fetchLyricsContent();
    } else {
      setLyrics('');
    }
  }, [currentSong, resolveMediaUrl]);

  const selectSong = useCallback(async (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, []);

  // Auto-select first song
  useEffect(() => {
    if (!currentSong && songs.length > 0 && !isLoadingSongs) {
      selectSong(songs[0]);
    }
  }, [songs, currentSong, selectSong, isLoadingSongs]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentSong || isResolvingUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const currentFileKey = currentSong.file_url;
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
      }
    }
  }, [isPlaying, currentSong, resolveMediaUrl, resolvedUrlCache, isResolvingUrl]);

  const playNext = useCallback(() => {
    if (!currentSong || songs.length === 0 || isResolvingUrl) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    selectSong(songs[nextIndex]);
  }, [currentSong, songs, selectSong, isResolvingUrl]);

  const playPrevious = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    selectSong(songs[prevIndex]);
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
