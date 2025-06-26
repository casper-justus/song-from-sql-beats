import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext'; // To play songs
import { Play, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from '@/components/ResolvedCoverImage'; // Import ResolvedCoverImage

type Song = Tables<'songs'>;
// type LikedSongEntry = Tables<'user_liked_songs'> & { songs: Song }; // Not strictly needed with current fetch

// Define spotifyGreen, or import from a central place if used elsewhere
const spotifyGreen = "#1DB954";

export default function LibraryPage() {
  const { user } = useAuth();
  const { selectSong, currentSong, isPlaying, togglePlay, isCurrentSongLiked, toggleLikeSong } = useMusicPlayer();
  const [likedSongsDetails, setLikedSongsDetails] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLikedSongsDetails = async () => {
      if (!user) {
        setIsLoading(false);
        setLikedSongsDetails([]);
        return;
      }
      setIsLoading(true);
      try {
        // Fetch song_ids from user_liked_songs
        const { data: likedEntries, error: likedError } = await supabase
          .from('user_liked_songs')
          .select('song_id') // Select only the song_id (UUID)
          .eq('user_id', user.id)
          .order('liked_at', { ascending: false });

        if (likedError) throw likedError;

        if (likedEntries && likedEntries.length > 0) {
          const songIdsToFetch = likedEntries.map(entry => entry.song_id);

          // Fetch full song details for these song_ids
          const { data: songsData, error: songsError } = await supabase
            .from('songs')
            .select('*')
            .in('id', songIdsToFetch); // 'id' is the UUID PK of songs table

          if (songsError) throw songsError;

          // Order songsData based on liked_at order (optional, requires more complex join or client-side sort)
          // For simplicity here, we'll use the order returned by the second query.
          setLikedSongsDetails(songsData || []);
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
  }, [user]);

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id && isPlaying) {
      togglePlay(); // Pause if it's the current playing song
    } else if (currentSong?.id === song.id && !isPlaying) {
      togglePlay(); // Play if it's the current paused song
    }
    else {
      selectSong(song); // Select and auto-play (or prepare to play)
      // togglePlay might be called implicitly by selectSong or need to be called after
      // depending on context's selectSong implementation
    }
  };

  const handleToggleLike = (song: Song) => {
    toggleLikeSong(song.id, song.video_id);
    // Note: This will update the context's likedSongIds, but LibraryPage's
    // local likedSongsDetails might not immediately reflect the unliked song's removal
    // unless we re-fetch or filter client-side. For now, icon will update due to context.
    // To remove immediately from view, filter likedSongsDetails:
    // setLikedSongsDetails(prev => prev.filter(s => s.id !== song.id));
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">My Library</h1>
        <p className="text-lg text-gray-400 mt-2">
          Your personal collection of music.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 border-b border-gray-700 pb-3">Liked Songs</h2>
        {isLoading ? (
          <p className="text-gray-300">Loading your liked songs...</p>
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
                    altText={song.title || 'Song cover'}
                    className="w-full h-full rounded object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-spotifyGreen' : 'text-white'}`}>
                    {song.title || "Unknown Title"}
                  </p>
                  <p className="text-sm text-gray-400 truncate">{song.artist || "Unknown Artist"}</p>
                </div>
                <div className="flex items-center space-x-3 ml-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleLike(song)}
                    className={cn("text-gray-400 hover:text-white w-8 h-8",
                                 // Check likedSongIds from context for this specific song
                                 likedSongIds.has(song.id) ? "text-spotifyGreen" : "")}
                  >
                    <Heart className={cn("w-5 h-5", likedSongIds.has(song.id) ? "fill-current" : "")} />
                  </Button>
                  <span className="text-sm text-gray-400 w-12 text-right hidden sm:inline-block">
                    {/* {formatTime(song.duration)} */} {/* Add if duration is available in Song type */}
                  </span>
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
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 border-b border-gray-700 pb-3">Playlists</h2>
        <div className="p-6 bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-300">Your created and saved playlists will appear here.</p>
          <p className="text-sm text-gray-500 mt-2">Playlist creation coming soon!</p>
          {/* <Link to="/playlists/new" className="mt-4 inline-block text-spotifyGreen hover:underline">
            Create New Playlist
          </Link> */}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold mb-6 border-b border-gray-700 pb-3">Albums</h2>
        <div className="p-6 bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-300">Albums you've saved or added to your library will show up here.</p>
          <p className="text-sm text-gray-500 mt-2">Album saving functionality coming soon!</p>
        </div>
      </section>
    </div>
  );
}
