
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';

export function BottomNavbar() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isCurrentSongLiked,
    toggleLikeSong,
    togglePlay,
    playNext,
    playPrevious,
  } = useMusicPlayer();

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id);
    }
  };

  if (!currentSong) {
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-md h-16 rounded-full shadow-2xl flex items-center justify-center px-4 backdrop-blur-lg border border-white/10"
             style={{ backgroundColor: '#F9C901' }}>
            <p className="text-gray-800 text-sm font-medium">No music selected</p>
        </div>
    );
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl h-20 rounded-full shadow-2xl flex items-center justify-between px-4 md:px-6 space-x-3 z-50 backdrop-blur-lg border border-white/20"
      style={{ backgroundColor: '#F9C901' }}
    >
      {/* Album Art & Info */}
      <div className="flex items-center space-x-3 flex-shrink min-w-0">
        <ResolvedCoverImage
          imageKey={currentSong.cover_url}
          altText={currentSong.title || 'Album cover'}
          className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white/30 shadow-lg"
        />
        <div className="flex flex-col min-w-0">
          <p className="text-sm md:text-base font-bold text-gray-900 truncate">{currentSong.title || "Unknown Title"}</p>
          <p className="text-xs md:text-sm text-gray-700 truncate">{currentSong.artist || "Unknown Artist"}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={playPrevious} className="text-gray-800 hover:bg-black/10 rounded-full w-8 h-8 md:w-10 md:h-10 transition-all">
          <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={togglePlay} className="text-gray-800 hover:bg-black/10 rounded-full w-12 h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-sm shadow-lg">
          {isPlaying ? <Pause className="w-6 h-6 md:w-7 md:h-7" /> : <Play className="w-6 h-6 md:w-7 md:h-7" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={playNext} className="text-gray-800 hover:bg-black/10 rounded-full w-8 h-8 md:w-10 md:h-10 transition-all">
          <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      {/* Like Button */}
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLikeClick}
          className={cn(
            "text-gray-800 hover:bg-black/10 rounded-full w-8 h-8 md:w-10 md:h-10 transition-all",
            isCurrentSongLiked && "text-red-600"
          )}
        >
          <Heart className={cn("w-4 h-4 md:w-5 md:h-5", isCurrentSongLiked && "fill-current")} />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-800 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
