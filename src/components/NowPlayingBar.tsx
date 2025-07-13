import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, FileText, Heart, List } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import ResolvedCoverImage from './ResolvedCoverImage';

export function NowPlayingBar() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    volume,
    seek,
    setVolumeLevel,
    isCurrentSongLiked,
    toggleLikeSong,
    setShowQueueDialog,
    setShowLyricsDialog,
  } = useMusicPlayer();

  if (!currentSong) {
    return null; // Don't render anything if no song is loaded
  }

  const handleSeek = (value: number[]) => seek(value[0]);
  const handleVolumeChange = (value: number[]) => setVolumeLevel(value[0]);
  const handleLikeClick = () => toggleLikeSong(currentSong.id, currentSong.video_id || '');

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-black/50 backdrop-blur-lg z-50 border-t border-white/20">
      <div className="container mx-auto p-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-gray-700">
            <ResolvedCoverImage
              imageKey={currentSong.cover_url}
              videoId={currentSong.video_id}
              altText={currentSong.title || 'Album cover'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-white">{currentSong.title || "Unknown Title"}</p>
            <p className="text-gray-400 text-sm truncate">{currentSong.artist}</p>
          </div>
          <div className="flex flex-col items-center gap-2 flex-grow-[2]">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={playPrevious} className="text-white hover:bg-white/20">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20 w-12 h-12">
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={playNext} className="text-white hover:bg-white/20">
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            <div className="w-full flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
                <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={handleSeek} className="w-full" />
                <span className="text-xs text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLikeClick} className={cn("text-white", isCurrentSongLiked && "text-red-500")}>
              <Heart className={cn("h-5 w-5", isCurrentSongLiked && "fill-current")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowLyricsDialog(true)}>
                <FileText className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowQueueDialog(true)}>
                <List className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 w-32">
                <Volume2 className="h-5 w-5" />
                <Slider value={[volume]} max={100} onValueChange={handleVolumeChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
