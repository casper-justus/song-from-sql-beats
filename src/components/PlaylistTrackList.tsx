
import React from 'react';
import { Play, Pause, MoreVertical, Trash2, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Tables } from '@/integrations/supabase/types';
import ResolvedCoverImage from './ResolvedCoverImage';
import { DownloadButton } from './DownloadButton';

type Song = Tables<'songs'>;

interface PlaylistTrackListProps {
  songs: Song[];
  playlistId?: string;
  onRemoveFromPlaylist?: (songId: string) => void;
  showRemoveOption?: boolean;
}

export function PlaylistTrackList({ 
  songs, 
  playlistId, 
  onRemoveFromPlaylist, 
  showRemoveOption = false 
}: PlaylistTrackListProps) {
  const { 
    currentSong, 
    isPlaying, 
    selectSong, 
    addToQueue,
    setQueue,
    playlists,
    addSongToPlaylist
  } = useMusicPlayer();

  const handlePlaySong = (song: Song) => {
    selectSong(song);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs, 0);
    }
  };

  const handleAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const handleRemoveFromPlaylist = (songId: string) => {
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist(songId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (songs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No songs in this playlist</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header with play all button */}
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="text-lg font-semibold text-white">
          {songs.length} song{songs.length !== 1 ? 's' : ''}
        </h3>
        <Button
          onClick={handlePlayAll}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Play className="w-4 h-4 mr-2" />
          Play All
        </Button>
      </div>

      {/* Track list */}
      {songs.map((song, index) => (
        <div
          key={song.id}
          className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors ${
            currentSong?.id === song.id ? 'bg-white/10' : ''
          }`}
        >
          {/* Track number / play button */}
          <div className="w-8 text-center">
            {currentSong?.id === song.id && isPlaying ? (
              <Pause className="w-4 h-4 text-green-500 mx-auto" />
            ) : (
              <button
                onClick={() => handlePlaySong(song)}
                className="text-gray-400 hover:text-white group-hover:hidden transition-colors"
              >
                {index + 1}
              </button>
            )}
            <button
              onClick={() => handlePlaySong(song)}
              className="hidden group-hover:block hover:scale-110 transition-transform"
            >
              <Play className="w-4 h-4 text-white mx-auto" />
            </button>
          </div>

          {/* Album art */}
          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700">
            <ResolvedCoverImage
              imageKey={song.cover_url}
              videoId={song.video_id}
              altText={song.title || 'Song cover'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${
              currentSong?.id === song.id ? 'text-green-500' : 'text-white'
            }`}>
              {song.title || "Unknown Title"}
            </p>
            <p className="text-gray-400 text-sm truncate">
              {song.artist || "Unknown Artist"}
            </p>
          </div>

          {/* Album name */}
          <div className="hidden md:block min-w-0 max-w-[200px]">
            <p className="text-gray-400 text-sm truncate">
              {song.album || "Unknown Album"}
            </p>
          </div>

          {/* Duration */}
          <div className="hidden sm:block text-gray-400 text-sm w-12 text-right">
            3:45
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DownloadButton song={song} className="w-8 h-8" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
                <DropdownMenuItem
                  onClick={() => handleAddToQueue(song)}
                  className="hover:bg-gray-700 cursor-pointer"
                >
                  <ListPlus className="w-4 h-4 mr-2" />
                  Add to Queue
                </DropdownMenuItem>

                <DropdownSub>
                  <DropdownSubTrigger className="hover:bg-gray-700 cursor-pointer">
                    <ListPlus className="w-4 h-4 mr-2" />
                    Add to Playlist
                  </DropdownSubTrigger>
                  <DropdownSubContent className="bg-gray-800 border-gray-700 text-white">
                    {playlists.length > 0 ? (
                      playlists.map(playlist => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={() => addSongToPlaylist(playlist.id, song.id)}
                          className="hover:bg-gray-700 cursor-pointer"
                        >
                          {playlist.name}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No playlists found</DropdownMenuItem>
                    )}
                  </DropdownSubContent>
                </DropdownSub>

                {showRemoveOption && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem
                      onClick={() => handleRemoveFromPlaylist(song.id)}
                      className="text-red-400 hover:bg-red-400/20 hover:text-red-300 focus:bg-red-400/20 focus:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Playlist
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
