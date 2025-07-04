
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Plus, Music, Trash2, Download, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LibraryPage() {
  const { user } = useUser();
  const { 
    playlists,
    createPlaylist,
    deletePlaylist
  } = useMusicPlayer();
  
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    try {
      await createPlaylist(newPlaylistName, newPlaylistDescription);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreatePlaylist(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      try {
        await deletePlaylist(playlistId);
      } catch (error) {
        console.error('Error deleting playlist:', error);
      }
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Please Login</h1>
          <p className="text-lg text-gray-400">You need to be logged in to view your library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">My Library</h1>
        <p className="text-lg text-gray-400 mt-2">
          Your personal collection of music.
        </p>
      </header>

      <Tabs defaultValue="playlists" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-8">
          <TabsTrigger value="playlists" className="text-white data-[state=active]:bg-green-600">
            Playlists
          </TabsTrigger>
          <TabsTrigger value="downloads" className="text-white data-[state=active]:bg-green-600">
            Downloads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Your Playlists</h2>
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
                <Link to={`/playlist/${playlist.id}`} key={playlist.id} className="block hover:no-underline">
                  <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700/70 transition-colors h-full flex flex-col">
                    <CardHeader className="pb-3 flex-grow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-white text-lg truncate hover:text-yellow-400 transition-colors">
                              {playlist.name}
                            </CardTitle>
                            {playlist.description && (
                              <p className="text-gray-400 text-sm truncate mt-1">{playlist.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault(); // Prevent navigation when clicking delete
                            e.stopPropagation();
                            handleDeletePlaylist(playlist.id);
                          }}
                          className="text-gray-400 hover:text-red-400 w-8 h-8 flex-shrink-0"
                          title="Delete playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-gray-500 text-xs">
                        Created {new Date(playlist.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-800 rounded-lg shadow-md">
              <p className="text-gray-300">You haven't created any playlists yet.</p>
              <p className="text-sm text-gray-500 mt-2">Create your first playlist to organize your music!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="downloads">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Downloaded Music</h2>
          </div>
          
          <div className="p-6 bg-gray-800 rounded-lg shadow-md">
            <div className="flex items-center justify-center flex-col space-y-4">
              <Folder className="w-16 h-16 text-gray-400" />
              <p className="text-gray-300 text-center">No downloaded songs yet.</p>
              <p className="text-sm text-gray-500 text-center">
                Download songs for offline listening by clicking the download button on any track.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
