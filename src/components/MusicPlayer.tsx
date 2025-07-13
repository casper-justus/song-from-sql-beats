
import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, Pause, SkipBack, SkipForward, Volume2, FileText, Heart, Plus, List, Shuffle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Tables } from '@/integrations/supabase/types';
import { Lrc, LrcLine } from 'react-lrc'; // Added import
import ResolvedCoverImage from './ResolvedCoverImage';
import { QueueDialog } from './QueueDialog';
import { DownloadButton } from './DownloadButton';

type Song = Tables<'songs'>;

const MusicPlayer = () => {
  const {
    songs,
    currentSong,
    queue,
    currentQueueIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoadingSongs,
    lyrics,
    showLyricsDialog,
    isCurrentSongLiked,
    playlists,
    preloadProgress,
    toggleLikeSong,
    togglePlay,
    playNext,
    playPrevious,
    selectSong,
    setQueue,
    addToQueue,
    seek,
    setVolumeLevel,
    setShowLyricsDialog,
    setShowQueueDialog,
    addSongToPlaylist,
    playNextInQueue,
  } = useMusicPlayer();
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84, // Estimate of song item height in pixels
    overscan: 5,
  });

  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null);

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id || '');
    }
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolumeLevel(value[0]);
  };

  const handleAddSongToPlaylist = async (playlistId: string, song: Song) => {
    await addSongToPlaylist(playlistId, song.id);
    setSelectedSongForPlaylist(null);
  };

  const handlePlayAllSongs = () => {
    if (songs.length > 0) {
      setQueue(songs, 0);
    }
  };

  const handleAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoadingSongs) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
        <div className="text-white text-xl mb-4">Loading your music...</div>
        {preloadProgress > 0 && preloadProgress < 100 && (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-400 mb-2 text-center">Preloading tracks... {Math.round(preloadProgress)}%</p>
            <Progress value={preloadProgress} className="w-full" />
          </div>
        )}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[60vh]">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Songs Found</h2>
          <p className="text-lg">Your music library is empty.</p>
        </div>
      </div>
    );
  }

  if (!currentSong && songs.length > 0) {
     return (
      <div className="flex items-center justify-center p-8 min-h-[60vh]">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Select a Song</h2>
          <p className="text-lg mb-4">Choose a song from your library to start playing.</p>
          <Button onClick={handlePlayAllSongs} className="bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />
            Play All Songs
          </Button>
        </div>
      </div>
    );
  }

  if (!currentSong) {
    return (
         <div className="flex items-center justify-center p-8 min-h-[60vh]">
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">Music Unavailable</h2>
              <p className="text-lg">No song is currently selected or available.</p>
            </div>
          </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Song List - Now takes up the main view */}
        <Card className="bg-black/30 border-white/20 backdrop-blur-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-white">
                Your Library ({songs.length} songs)
            </h3>
            <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAllSongs}
                className="text-green-400 hover:text-green-300 hover:bg-green-400/10 self-start sm:self-auto"
            >
                <Shuffle className="w-4 h-4 mr-2" />
                Play All
            </Button>
            </div>
            
            <div ref={parentRef} className="max-h-[75vh] overflow-y-auto list-container">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map(virtualItem => {
                const song = songs[virtualItem.index];
                return (
                    <div
                    key={song.id}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={`p-3 rounded-lg transition-all duration-200 hover:bg-white/10 group ${
                        currentSong?.id === song.id ? 'bg-white/20' : ''
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700 cursor-pointer"
                        onClick={() => selectSong(song)}
                        >
                        <ResolvedCoverImage
                            imageKey={song.cover_url}
                            videoId={song.video_id}
                            altText={song.title || 'Song cover'}
                            className="w-full h-full object-cover"
                        />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => selectSong(song)}>
                        <p className={`font-medium truncate text-sm sm:text-base ${
                            currentSong?.id === song.id ? 'text-green-500' : 'text-white'
                        }`}>
                            {song.title || "Unknown Title"}
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">
                            {song.artist}
                        </p>
                        {song.album && (
                            <p className="text-gray-500 text-xs truncate hidden sm:block">
                            {song.album}
                            </p>
                        )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DownloadButton song={song} className="w-7 h-7 sm:w-8 sm:h-8" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                            e.stopPropagation();
                            handleAddToQueue(song);
                            }}
                            className="text-blue-400 hover:bg-blue-400/20 w-7 h-7 sm:w-8 sm:h-8"
                            title="Add to queue"
                        >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20 w-7 h-7 sm:w-8 sm:h-8"
                                onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSongForPlaylist(song);
                                }}
                            >
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); playNextInQueue(song); }}
                                className="hover:bg-gray-700 cursor-pointer"
                            >
                                Play Next
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }}
                                className="hover:bg-gray-700 cursor-pointer"
                            >
                                Add to Queue
                            </DropdownMenuItem>
                            {playlists.length > 0 && <DropdownMenuItem disabled className="border-t border-gray-700 my-1 h-px p-0" />}
                            {playlists.length > 0 ? (
                                playlists.map((playlist) => (
                                <DropdownMenuItem
                                    key={playlist.id}
                                    onClick={() => handleAddSongToPlaylist(playlist.id, song)}
                                    className="hover:bg-gray-700 cursor-pointer"
                                >
                                    Add to: {playlist.name}
                                </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled className="text-gray-500 italic">
                                No playlists to add to
                                </DropdownMenuItem>
                            )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="text-right hidden lg:block">
                            {song.year && (
                            <span className="text-gray-400 text-sm">{song.year}</span>
                            )}
                            {song.genre && (
                            <p className="text-gray-500 text-xs">{song.genre}</p>
                            )}
                        </div>
                        </div>
                    </div>
                    </div>
                );
                })}
            </div>
            </div>
        </Card>
      </div>
      <QueueDialog />
    </div>
  );
};

export default MusicPlayer;
