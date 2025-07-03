
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { Tables } from '@/integrations/supabase/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Play, Pause, Heart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from '@/components/ResolvedCoverImage';

type Song = Tables<'songs'>;

export default function LikedSongsPage() {
  const { user } = useUser();
  const { supabase, isReady } = useClerkSupabase();
  const { 
    selectSong, 
    currentSong, 
    isPlaying, 
    togglePlay, 
    likedSongIds, 
    toggleLikeSong
  } = useMusicPlayer();
  
  const [likedSongsDetails, setLikedSongsDetails] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLikedSongsDetails = async () => {
      if (!user || !isReady || !supabase) {
        setIsLoading(false);
        setLikedSongsDetails([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const { data: likedEntries, error: likedError } = await supabase
          .from('user_liked_songs')
          .select('song_id')
          .eq('user_id', user.id)
          .order('liked_at', { ascending: false });

        if (likedError) {
          console.error('Error fetching liked songs:', likedError);
          setLikedSongsDetails([]);
          return;
        }

        if (likedEntries && likedEntries.length > 0) {
          const songIdsToFetch = likedEntries.map(entry => entry.song_id);
          const { data: songsData, error: songsError } = await supabase
            .from('songs')
            .select('*')
            .in('id', songIdsToFetch);

          if (songsError) {
            console.error('Error fetching songs data:', songsError);
            setLikedSongsDetails([]);
            return;
          }
          
          const orderedSongs = likedEntries
            .map(entry => songsData?.find(song => song.id === entry.song_id))
            .filter(Boolean) as Song[];
          
          setLikedSongsDetails(orderedSongs);
        } else {
          setLikedSongsDetails([]);
        }
      } catch (error) {
        console.error('Error fetching liked songs details:', error);
        setLikedSongsDetails([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedSongsDetails();
  }, [user, isReady, supabase, likedSongIds]);

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id && isPlaying) {
      togglePlay();
    } else {
      selectSong(song);
    }
  };

  const handleToggleLike = async (song: Song) => {
    await toggleLikeSong(song.id, song.video_id || '');
  };

  const handleDownload = async (song: Song) => {
    // Download functionality will be implemented
    console.log('Download song:', song.title);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Please Login</h1>
          <p className="text-lg text-gray-400">You need to be logged in to view your liked songs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Liked Songs</h1>
        <p className="text-lg text-gray-400 mt-2">
          Songs you've marked as favorites
        </p>
      </header>

      {isLoading || !isReady ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-300">Loading your liked songs...</div>
        </div>
      ) : likedSongsDetails.length > 0 ? (
        <div className="space-y-3">
          {likedSongsDetails.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center p-3 bg-gray-800/70 hover:bg-gray-700/80 rounded-lg transition-colors duration-200 group"
            >
              <span className="text-gray-400 w-8 text-center mr-3">{index + 1}</span>
              <div className="w-12 h-12 rounded object-cover mr-4 flex-shrink-0 bg-gray-700">
                <ResolvedCoverImage
                  imageKey={song.cover_url}
                  videoId={song.video_id}
                  altText={song.title || 'Song cover'}
                  className="w-full h-full rounded object-cover"
                />
              </div>
              <div className="flex-grow min-w-0">
                <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-green-500' : 'text-white'}`}>
                  {song.title || "Unknown Title"}
                </p>
                <p className="text-sm text-gray-400 truncate">{song.artist || "Unknown Artist"}</p>
              </div>
              <div className="flex items-center space-x-3 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(song)}
                  className="text-gray-400 hover:text-white w-8 h-8"
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleLike(song)}
                  className={cn("text-gray-400 hover:text-white w-8 h-8",
                               likedSongIds.has(song.id) ? "text-red-500" : "")}
                >
                  <Heart className={cn("w-5 h-5", likedSongIds.has(song.id) ? "fill-current" : "")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePlaySong(song)}
                  className="text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-8 h-8"
                >
                  {currentSong?.id === song.id && isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-300">You haven't liked any songs yet. Start exploring and tap the heart on songs you love!</p>
        </div>
      )}
    </div>
  );
}
