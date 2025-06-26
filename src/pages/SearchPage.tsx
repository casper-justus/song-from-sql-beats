import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Play, Pause, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from '@/components/ResolvedCoverImage'; // Import ResolvedCoverImage

type Song = Tables<'songs'>;
const spotifyGreen = "#1DB954"; // Centralize this if used in more places

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const { selectSong, currentSong, isPlaying, togglePlay, toggleLikeSong, likedSongIds } = useMusicPlayer();

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchPerformed(true);
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    try {
      // Performing OR search across multiple fields.
      // For more advanced search, consider using Supabase functions or full-text search.
      const query = searchTerm.trim().split(' ').map(term => `${term}:*`).join(' & '); // Prepare for FTS if enabled

      // Using ilike for broader matching. For FTS, you'd use .textSearch('fts_column', query)
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%,album.ilike.%${searchTerm}%`);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching songs:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id && isPlaying) togglePlay();
    else if (currentSong?.id === song.id && !isPlaying) togglePlay();
    else selectSong(song);
  };

  const handleToggleLike = (song: Song) => {
    toggleLikeSong(song.id, song.video_id);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold">Search</h1>
        <p className="text-lg text-gray-400 mt-2">
          Find your favorite songs, artists, and albums.
        </p>
      </header>

      <div className="max-w-xl mx-auto mb-12">
        <form
          onSubmit={handleSearch}
          className="flex items-center space-x-3 p-1 bg-white rounded-full shadow-md" // White search bar like Spotify
        >
          <Input
            type="search"
            placeholder="What do you want to listen to?"
            className="flex-grow bg-transparent border-none text-black placeholder-gray-500 focus:ring-0 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="text-gray-700 hover:text-black rounded-full w-10 h-10 flex-shrink-0"
            disabled={isLoading}
          >
            <SearchIcon size={22} />
          </Button>
        </form>
      </div>

      <section>
        {isLoading ? (
          <p className="text-center text-gray-300">Searching...</p>
        ) : searchPerformed && searchResults.length === 0 ? (
          <div className="p-6 bg-gray-800 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-semibold mb-2">No Results Found for "{searchTerm}"</h2>
            <p className="text-gray-400">Try searching for something else, or check your spelling.</p>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">Search Results ({searchResults.length})</h2>
            <div className="space-y-3">
              {searchResults.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center p-3 bg-gray-800/70 hover:bg-gray-700/80 rounded-lg transition-colors duration-200 group"
                >
                  <span className="text-gray-400 w-8 text-center mr-3 hidden sm:block">{index + 1}</span>
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
                      className={cn("text-gray-400 hover:text-white w-8 h-8", likedSongIds.has(song.id) ? "text-spotifyGreen" : "")}
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
          </>
        ) : searchPerformed ? ( // Search was performed but term was empty
          <div className="p-6 bg-gray-800 rounded-lg shadow-md text-center">
             <p className="text-gray-400">Enter a search term to find music.</p>
          </div>
        ) : (
           <div className="p-6 bg-gray-800 rounded-lg shadow-md min-h-[200px] flex items-center justify-center">
             <p className="text-gray-300">Start typing to search for songs, artists, or albums.</p>
           </div>
        )}
      </section>

      {/* Placeholder for Browse Categories (Optional - kept from before) */}
      {!searchPerformed && searchResults.length === 0 && (
        <section className="mt-12">
          <h3 className="text-xl font-semibold mb-4 text-center">Or Browse Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Podcasts', 'Charts'].map((category) => (
              <div key={category} className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center cursor-pointer">
                <p className="font-medium">{category}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
