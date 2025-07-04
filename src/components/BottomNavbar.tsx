
import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, List } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';

export function BottomNavbar() {
  const {
    currentSong,
    queue,
    currentQueueIndex,
    isPlaying,
    currentTime,
    duration,
    isCurrentSongLiked,
    toggleLikeSong,
    togglePlay,
    playNext,
    playPrevious,
    setShowQueueDialog,
  } = useMusicPlayer();

  const [dominantColor, setDominantColor] = useState('#F9C901');

  // Generate dynamic colors based on song info
  useEffect(() => {
    if (currentSong) {
      const generateColorFromText = (text: string): string => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 55%)`;
      };
      
      const newColor = generateColorFromText(currentSong.title + (currentSong.artist || ''));
      setDominantColor(newColor);
    }
  }, [currentSong]);

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id || '');
    }
  };

  if (!currentSong) {
    return null;
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 mx-auto w-[95%] sm:w-11/12 max-w-4xl h-16 sm:h-20 rounded-full shadow-2xl flex items-center justify-between px-3 sm:px-6 space-x-2 sm:space-x-3 z-50 backdrop-blur-lg border border-white/20 relative overflow-hidden transition-all duration-500"
      style={{ 
        backgroundColor: dominantColor,
        boxShadow: `0 8px 32px ${dominantColor}40, 0 0 0 1px ${dominantColor}20`
      }}
    >
      {/* Album Art & Info */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink min-w-0">
        <ResolvedCoverImage
          imageKey={currentSong.cover_url}
          videoId={currentSong.video_id}
          altText={currentSong.title || 'Album cover'}
          className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white/30 shadow-lg"
        />
        <div className="flex flex-col min-w-0">
          <p className="text-xs sm:text-sm md:text-base font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[200px]">
            {currentSong.title?.substring(0, 30) || "Unknown Title"}
          </p>
          <p className="text-xs text-gray-700 truncate max-w-[120px] sm:max-w-[180px]">
            {currentSong.artist?.substring(0, 25) || "Unknown Artist"}
          </p>
          <p className="text-xs text-gray-600 hidden sm:block">
            {currentQueueIndex + 1} of {queue.length}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={playPrevious} 
          className="text-gray-800 hover:bg-black/10 rounded-full w-8 h-8 sm:w-10 sm:h-10 transition-all"
        >
          <SkipBack className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={togglePlay} 
          className="text-gray-800 hover:bg-black/10 rounded-full w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-sm shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={playNext} 
          className="text-gray-800 hover:bg-black/10 rounded-full w-8 h-8 sm:w-10 sm:h-10 transition-all"
        >
          <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
        {/* Queue Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowQueueDialog(true)}
          className="text-gray-800 hover:bg-black/10 rounded-full w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 transition-all"
        >
          <List className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </Button>
        
        {/* Like Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLikeClick}
          className={cn(
            "text-gray-800 hover:bg-black/10 rounded-full w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 transition-all",
            isCurrentSongLiked && "text-red-600"
          )}
        >
          <Heart className={cn("w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5", isCurrentSongLiked && "fill-current")} />
        </Button>
      </div>

      {/* Progress Bar - Properly contained within the navbar */}
      <div className="absolute bottom-1 left-3 right-3 sm:left-4 sm:right-4 h-1 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-800 transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(Math.max(progressPercentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
