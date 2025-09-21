
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Plus, Music, Trash2, Download, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
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
  const [downloadedTracks, setDownloadedTracks] = useState<{ songId: string; title: string; artist: string; fileName: string }[]>([]);

  React.useEffect(() => {
    // Load downloaded tracks from localStorage when component mounts or tab is active
    // This could be tied to when the "downloads" tab becomes active for efficiency
    const storedDownloads = JSON.parse(localStorage.getItem('downloadedSongsList') || '[]');
    setDownloadedTracks(storedDownloads);
  }, []);

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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white min-h-screen max-w-7xl">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">My Library</h1>
        <p className="text-base sm:text-lg text-gray-400 mt-2">
          Your personal collection of music.
        </p>
      </header>

      <Tabs defaultValue="playlists" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-6 h-10 sm:h-11">
          <TabsTrigger value="playlists" className="text-white data-[state=active]:bg-green-600 text-sm sm:text-base">
            Playlists
          </TabsTrigger>
          <TabsTrigger value="downloads" className="text-white data-[state=active]:bg-green-600 text-sm sm:text-base">
            Downloads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Your Playlists</h2>
            <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white border-gray-700">
                <DialogHeader>
                  <DialogTitle>Create New Playlist</DialogTitle>
                  <DialogDescription>
                    Give your new playlist a name and an optional description.
                  </DialogDescription>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {playlists.map((playlist) => (
                <Link to={`/playlist/${playlist.id}`} key={playlist.id} className="block hover:no-underline">
                  <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700/70 transition-colors h-full flex flex-col">
                    <CardHeader className="pb-3 flex-grow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-white text-base sm:text-lg truncate hover:text-yellow-400 transition-colors">
                              {playlist.name}
                            </CardTitle>
                            {playlist.description && (
                              <p className="text-gray-400 text-xs sm:text-sm truncate mt-1">{playlist.description}</p>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Download History</h2>
            {downloadedTracks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear your download history? This does not delete files from your computer.')) {
                      localStorage.removeItem('downloadedSongsList');
                      setDownloadedTracks([]);
                    }
                  }}
                  className="text-red-500 border-red-500 hover:bg-red-500/10 hover:text-red-400 w-full sm:w-auto"
                >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear History
              </Button>
            )}
          </div>
          
          {downloadedTracks.length > 0 ? (
            <div className="space-y-3">
              {downloadedTracks.map((track, index) => (
                <div
                  key={track.songId || index}
                  className="p-3 sm:p-4 rounded-lg bg-gray-800/60 border border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate text-sm sm:text-base">{track.title}</p>
                      <p className="text-gray-400 text-xs sm:text-sm truncate">{track.artist}</p>
                      <p className="text-gray-500 text-xs truncate">{track.fileName}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const updatedTracks = downloadedTracks.filter(t => t.songId !== track.songId);
                      localStorage.setItem('downloadedSongsList', JSON.stringify(updatedTracks));
                      setDownloadedTracks(updatedTracks);
                    }}
                    className="text-gray-400 hover:text-red-500 w-8 h-8"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
               <p className="text-xs text-gray-500 text-center pt-4">
                This list tracks songs you've started downloading via this browser. It does not manage the actual files on your device or guarantee offline availability within this app.
              </p>
            </div>
          ) : (
            <div className="p-8 bg-gray-800/40 rounded-lg shadow-md text-center">
              <Folder className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300">Your download history is empty.</p>
              <p className="text-sm text-gray-500 mt-2">
                Songs you download will appear here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
