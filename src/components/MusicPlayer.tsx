
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
    <div className="w-full px-2 sm:px-4 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Main Player UI Card */}
          <div className="bg-black/10 border border-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6">
              <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 mx-auto mb-6 rounded-xl overflow-hidden shadow-2xl bg-gray-700">
                <ResolvedCoverImage
                  imageKey={currentSong.cover_url}
                  videoId={currentSong.video_id}
                  altText={currentSong.title || 'Album cover'}
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-2 px-2 text-shadow-lg">
                {currentSong.title || "Unknown Title"}
              </h2>
              <p className="text-base sm:text-lg text-white/60 mb-1 px-2 text-shadow">
                {currentSong.artist}
              </p>
              {currentSong.album && (
                <p className="text-white/50 px-2">{currentSong.album}</p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
                disabled={!currentSong || duration === 0}
              />
              <div className="flex justify-between text-sm text-white/50 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={playPrevious} className="text-white/80 hover:bg-white/20 rounded-full w-12 h-12">
                <SkipBack className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white bg-white/20 hover:bg-white/30 rounded-full w-16 h-16">
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={playNext} className="text-white/80 hover:bg-white/20 rounded-full w-12 h-12">
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>

            {/* other actions */}
            <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleLikeClick} className={cn("text-white/70 hover:text-white", isCurrentSongLiked && "text-red-500")}>
                    <Heart className={cn("h-5 w-5", isCurrentSongLiked && "fill-current")} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowQueueDialog(true)} className="text-white/70 hover:text-white">
                    <List className="h-5 w-5" />
                </Button>
            </div>
          </div>

          {/* Song List */}
          <div className="bg-black/10 border border-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white/90">
                Library ({songs.length} songs)
              </h3>
              <Button variant="ghost" size="sm" onClick={handlePlayAllSongs} className="text-green-400 hover:text-green-300 hover:bg-green-400/10 self-start sm:self-auto">
                <Shuffle className="w-4 h-4 mr-2" />
                Play All
              </Button>
            </div>
            
            <div ref={parentRef} className="max-h-[60vh] overflow-y-auto list-container">
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
                      className={`p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group ${
                        currentSong?.id === song.id ? 'bg-white/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-700 cursor-pointer"
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
                          <p className={`font-semibold truncate text-white/90 ${ currentSong?.id === song.id ? 'text-yellow-400' : '' }`}>
                            {song.title || "Unknown Title"}
                          </p>
                          <p className="text-sm text-white/60 truncate">
                            {song.artist}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DownloadButton song={song} className="w-8 h-8" />
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }} className="text-white/70 hover:text-white w-8 h-8" title="Add to queue">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white w-8 h-8" onClick={(e) => { e.stopPropagation(); setSelectedSongForPlaylist(song); }}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800/80 backdrop-blur-lg border-gray-700 text-white">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); playNextInQueue(song); }} className="hover:bg-gray-700 cursor-pointer">
                                Play Next
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }} className="hover:bg-gray-700 cursor-pointer">
                                Add to Queue
                              </DropdownMenuItem>
                              {playlists.length > 0 && <DropdownMenuItem disabled className="border-t border-gray-700 my-1 h-px p-0" />}
                              {playlists.length > 0 ? (
                                playlists.map((playlist) => (
                                  <DropdownMenuItem key={playlist.id} onClick={() => handleAddSongToPlaylist(playlist.id, song)} className="hover:bg-gray-700 cursor-pointer">
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <QueueDialog />
    </div>
  );
};

export default MusicPlayer;
