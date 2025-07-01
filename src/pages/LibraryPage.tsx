import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClerkAuth } from '@/contexts/ClerkContext';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { Tables } from '@/integrations/supabase/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Play, Pause, Heart, Plus, Music, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from '@/components/ResolvedCoverImage';

type Song = Tables<'songs'>;
type Playlist = Tables<'playlists'>;

const spotifyGreen = "#1DB954";

export default function LibraryPage() {
  const { user } = useClerkAuth();
  const { supabase, isReady } = useClerkSupabase();
  const { 
    selectSong, 
    currentSong, 
    isPlaying, 
    togglePlay, 
    likedSongIds, 
    toggleLikeSong,
    playlists,
    createPlaylist,
    deletePlaylist
  } = useMusicPlayer();
  
  const [likedSongsDetails, setLikedSongsDetails] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');

  useEffect(() => {
    const fetchLikedSongsDetails = async () => {
      if (!user || !isReady || !supabase) {
        setIsLoading(false);
        setLikedSongsDetails([]);
        return;
      }
      setIsLoading(true);
      try {
        console.log('Fetching liked songs for user:', user.id);
        
        const { data: likedEntries, error: likedError } = await supabase
          .from('user_liked_songs')
          .select('song_id')
          .eq('user_id', user.id)
          .order('liked_at', { ascending: false });

        if (likedError) throw likedError;

        if (likedEntries && likedEntries.length > 0) {
          const songIdsToFetch = likedEntries.map(entry => entry.song_id);
          const { data: songsData, error: songsError } = await supabase
            .from('songs')
            .select('*')
            .in('id', songIdsToFetch);

          if (songsError) throw songsError;
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
  }, [user, isReady, supabase]);

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id && isPlaying) {
      togglePlay();
    } else if (currentSong?.id === song.id && !isPlaying) {
      togglePlay();
    } else {
      selectSong(song);
    }
  };

  const handleToggleLike = (song: Song) => {
    toggleLikeSong(song.id, song.video_id || '');
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    await createPlaylist(newPlaylistName, newPlaylistDescription);
    setNewPlaylistName('');
    setNewPlaylistDescription('');
    setShowCreatePlaylist(false);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist(playlistId);
    }
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
        {isLoading || !isReady ? (
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
                  <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-green-500' : 'text-white'}`}>
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
                                 likedSongIds.has(song.id) ? "text-green-500" : "")}
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
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-3">
          <h2 className="text-3xl font-semibold">Playlists</h2>
          <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <div>
                  <label htmlFor="playlist-name" className="block text-sm font-medium mb-2">
                    Playlist Name
                  </label>
                  <Input
                    id="playlist-name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Enter playlist name"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="playlist-description" className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    id="playlist-description"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="Enter playlist description"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreatePlaylist(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {playlists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <Card key={playlist.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                        <Music className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg truncate">{playlist.name}</CardTitle>
                        {playlist.description && (
                          <p className="text-gray-400 text-sm truncate">{playlist.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="text-gray-400 hover:text-red-400 w-8 h-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-sm">
                    Created {new Date(playlist.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-300">You haven't created any playlists yet.</p>
            <p className="text-sm text-gray-500 mt-2">Create your first playlist to organize your music!</p>
          </div>
        )}
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
