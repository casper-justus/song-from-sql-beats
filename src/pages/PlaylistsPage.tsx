import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Music, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PlaylistsPage() {
  const { user } = useUser();
  const { playlists, createPlaylist, likedSongIds } = useMusicPlayer();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim());
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Playlist created successfully",
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Please Login</h1>
          <p className="text-lg text-gray-400">You need to be logged in to view your playlists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white min-h-screen">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Your Library</h1>
            <p className="text-lg text-gray-400 mt-2">
              Your playlists and liked songs
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Playlist Name</label>
                  <Input
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Enter playlist name"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                  <Textarea
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="Enter playlist description"
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePlaylist}
                    disabled={isCreating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Liked Songs */}
        <Link to="/liked-songs">
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/20 hover:border-purple-400/40 transition-all duration-200 hover:scale-105 cursor-pointer">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-white fill-current" />
              </div>
              <CardTitle className="text-white">Liked Songs</CardTitle>
              <CardDescription className="text-gray-400">
                {likedSongIds.size} song{likedSongIds.size !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* User Playlists */}
        {playlists.map((playlist) => (
          <Link key={playlist.id} to={`/playlist/${playlist.id}`}>
            <Card className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all duration-200 hover:scale-105 cursor-pointer">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mb-3">
                  <Music className="w-6 h-6 text-gray-300" />
                </div>
                <CardTitle className="text-white truncate">{playlist.name}</CardTitle>
                <CardDescription className="text-gray-400 line-clamp-2">
                  {playlist.description || 'No description'}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}

        {/* Empty state */}
        {playlists.length === 0 && (
          <Card className="bg-gray-800/40 border-gray-700 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Music className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 text-center">
                No playlists yet. Create your first playlist to get started!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}