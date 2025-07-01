
import React, { useState, useEffect } from 'react';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { Tables } from '@/integrations/supabase/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';  
import { useAuth } from '@/contexts/ClerkContext';
import { Play, Pause, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ResolvedCoverImage from './ResolvedCoverImage';

type Song = Tables<'songs'>;
type Playlist = Tables<'playlists'>;

interface PlaylistManagerProps {
  playlist: Playlist;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ playlist }) => {
  const { user } = useAuth();
  const { supabase, isReady } = useClerkSupabase();
  const { 
    songs, 
    selectSong, 
    currentSong, 
    isPlaying, 
    togglePlay,
    addSongToPlaylist,
    removeSongFromPlaylist
  } = useMusicPlayer();
  
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPlaylistSongs();
  }, [playlist.id, isReady, supabase]);

  const fetchPlaylistSongs = async () => {
    if (!user || !isReady || !supabase) return;
    setIsLoading(true);
    try {
      console.log('Fetching playlist songs for playlist:', playlist.id);
      
      const { data, error } = await supabase
        .from('playlist_songs')
        .select(`
          song_id,
          songs (*)
        `)
        .eq('playlist_id', playlist.id)
        .order('position');

      if (error) throw error;
      
      const songs = data?.map(item => item.songs).filter(Boolean) as Song[] || [];
      setPlaylistSongs(songs);
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSong = async (songId: string) => {
    await addSongToPlaylist(playlist.id, songId);
    fetchPlaylistSongs();
  };

  const handleRemoveSong = async (songId: string) => {
    await removeSongFromPlaylist(playlist.id, songId);
    fetchPlaylistSongs();
  };

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id && isPlaying) {
      togglePlay();
    } else if (currentSong?.id === song.id && !isPlaying) {
      togglePlay();
    } else {
      selectSong(song);
    }
  };

  const availableSongs = songs.filter(song => 
    !playlistSongs.some(playlistSong => playlistSong.id === song.id)
  );

  if (!isReady) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <p className="text-gray-400">Loading playlist...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{playlist.name}</CardTitle>
          <Dialog open={showAddSongs} onOpenChange={setShowAddSongs}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Songs
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Songs to {playlist.name}</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableSongs.length > 0 ? (
                  availableSongs.map((song) => (
                    <div key={song.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded bg-gray-600 flex-shrink-0">
                          <ResolvedCoverImage
                            imageKey={song.cover_url}
                            altText={song.title || 'Song cover'}
                            className="w-full h-full rounded object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-white truncate">{song.title}</p>
                          <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddSong(song.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">All songs are already in this playlist</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {playlist.description && (
          <p className="text-gray-400">{playlist.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-gray-400">Loading songs...</p>
        ) : playlistSongs.length > 0 ? (
          <div className="space-y-2">
            {playlistSongs.map((song, index) => (
              <div key={song.id} className="flex items-center p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors group">
                <span className="text-gray-400 w-6 text-center mr-3">{index + 1}</span>
                <div className="w-10 h-10 rounded bg-gray-600 mr-3 flex-shrink-0">
                  <ResolvedCoverImage
                    imageKey={song.cover_url}
                    altText={song.title || 'Song cover'}
                    className="w-full h-full rounded object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-green-500' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePlaySong(song)}
                    className="text-white w-8 h-8"
                  >
                    {currentSong?.id === song.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSong(song.id)}
                    className="text-red-400 hover:text-red-300 w-8 h-8"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No songs in this playlist yet. Add some songs to get started!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PlaylistManager;
