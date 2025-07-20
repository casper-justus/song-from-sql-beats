import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Play, Music, MoreVertical, SkipForward, ListPlus } from 'lucide-react'; // Added icons
import { supabase } from '@/integrations/supabase/client';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // Added Dropdown
import ResolvedCoverImage from '@/components/ResolvedCoverImage';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  cover_url: string | null;
  file_url: string;
  video_id: string | null;
  genre: string | null;
  mood: string | null;
  created_at: string;
  local_path_on_upload: string | null;
  lyrics_url: string | null;
  nfo_url: string | null;
  storage_path: string;
  user_id: string | null;
}

import { DynamicBackground } from '@/components/DynamicBackground';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectSong, playNextInQueue, addToQueue } = useMusicPlayer(); // Added playNextInQueue, addToQueue
  const { toast } = useToast();

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      console.log('Searching for:', query);

      // Check if query is a number for year search
      const yearQuery = parseInt(query);
      const isValidYear = !isNaN(yearQuery) && yearQuery > 1900 && yearQuery < 2100;

      let supabaseQuery = supabase
        .from('songs')
        .select('*');

      if (isValidYear) {
        // If it's a valid year, search in all fields including year
        supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%,video_id.ilike.%${query}%,year.eq.${yearQuery}`);
      } else {
        // Search in text fields only
        supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%,video_id.ilike.%${query}%`);
      }

      const { data, error } = await supabaseQuery.limit(20);

      if (error) {
        console.error('Search error:', error);
        toast({
          title: "Search Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Search results:', data);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search songs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handlePlaySong = (song: Song) => {
    console.log('Playing song:', song);
    selectSong(song);
  };

  return (
    <div className="min-h-screen pb-32 pt-20">
      <DynamicBackground />
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Search Music</h1>
          <p className="text-lg text-gray-400">Find your favorite songs by title, artist, album, or year</p>
        </header>

        {/* Search Input */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by title, artist, album, year, or video ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 text-lg py-3"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-400">Searching...</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">
              Search Results ({searchResults.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((song) => (
                <Card key={song.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {song.cover_url || song.video_id ? (
                          <ResolvedCoverImage 
                            imageKey={song.cover_url}
                            videoId={song.video_id} // Pass video_id for YouTube thumbnail
                            altText={`${song.title} cover`}
                            className="w-full h-full object-cover"
                            width={64}
                            height={64}
                          />
                        ) : (
                          <Music className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {song.title}
                        </h3>
                        <p className="text-gray-400 truncate">
                          {song.artist}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {song.album && <span>{song.album}</span>}
                          {song.year && <span>• {song.year}</span>}
                          {song.genre && <span>• {song.genre}</span>}
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePlaySong(song)}
                        size="icon"
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        <Play className="w-5 h-5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-300 hover:text-yellow-400 w-8 h-8"
                            title="More options"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical size={20} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          onClick={(e) => e.stopPropagation()}
                          className="bg-gray-800 border-gray-700 text-white"
                        >
                          <DropdownMenuItem
                            onClick={() => playNextInQueue(song)}
                            className="hover:bg-gray-700 cursor-pointer"
                          >
                            <SkipForward className="w-4 h-4 mr-2" /> Play Next
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => addToQueue(song)}
                            className="hover:bg-gray-700 cursor-pointer"
                          >
                            <ListPlus className="w-4 h-4 mr-2" /> Add to Queue
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery && !loading && searchResults.length === 0 && (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">No songs found</p>
            <p className="text-gray-500">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">Start searching</p>
            <p className="text-gray-500">
              Search by song title, artist, album, year, or video ID
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
