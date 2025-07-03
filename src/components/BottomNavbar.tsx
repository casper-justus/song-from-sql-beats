
import React from 'react';
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

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id || '');
    }
  };

  if (!currentSong) {
    return null;
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate dynamic colors based on current song
  const generateDynamicColors = (title: string, artist: string) => {
    let hash = 0;
    const text = title + artist;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return {
      primary: `hsl(${hue}, 70%, 55%)`,
      secondary: `hsl(${(hue + 30) % 360}, 60%, 45%)`,
      background: `hsl(${hue}, 40%, 25%)`,
      accent: `hsl(${(hue + 60) % 360}, 80%, 60%)`
    };
  };

  const colors = generateDynamicColors(currentSong.title || '', currentSong.artist || '');

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl h-20 rounded-full shadow-2xl flex items-center justify-between px-4 md:px-6 space-x-3 z-50 backdrop-blur-lg border border-white/20 relative overflow-hidden transition-all duration-500"
      style={{ 
        background: `linear-gradient(135deg, ${colors.background}F0, ${colors.primary}40)`,
        borderColor: `${colors.accent}60`
      }}
    >
      {/* Album Art & Info */}
      <div className="flex items-center space-x-3 flex-shrink min-w-0">
        <div 
          className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden shadow-lg border-2 transition-all duration-300"
          style={{ borderColor: `${colors.accent}80` }}
        >
          <ResolvedCoverImage
            imageKey={currentSong.cover_url}
            videoId={currentSong.video_id}
            altText={currentSong.title || 'Album cover'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-sm md:text-base font-bold text-white truncate drop-shadow-sm">
            {currentSong.title || "Unknown Title"}
          </p>
          <p className="text-xs md:text-sm text-gray-200 truncate drop-shadow-sm">
            {currentSong.artist || "Unknown Artist"}
          </p>
          <p className="text-xs text-gray-300 drop-shadow-sm">
            {currentQueueIndex + 1} of {queue.length}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={playPrevious} 
          className="text-white hover:bg-white/20 rounded-full w-8 h-8 md:w-10 md:h-10 transition-all"
        >
          <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={togglePlay} 
          className="text-white rounded-full w-12 h-12 md:w-14 md:h-14 shadow-lg transition-all duration-300 hover:scale-105"
          style={{ 
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            boxShadow: `0 4px 20px ${colors.primary}40`
          }}
        >
          {isPlaying ? <Pause className="w-6 h-6 md:w-7 md:h-7" /> : <Play className="w-6 h-6 md:w-7 md:h-7" />}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={playNext} 
          className="text-white hover:bg-white/20 rounded-full w-8 h-8 md:w-10 md:h-10 transition-all"
        >
          <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Queue Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowQueueDialog(true)}
          className="text-white hover:bg-white/20 rounded-full w-8 h-8 md:w-10 md:h-10 transition-all"
        >
          <List className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        
        {/* Like Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLikeClick}
          className={cn(
            "rounded-full w-8 h-8 md:w-10 md:h-10 transition-all duration-300",
            isCurrentSongLiked 
              ? "text-red-400 hover:text-red-300" 
              : "text-white hover:bg-white/20"
          )}
        >
          <Heart className={cn("w-4 h-4 md:w-5 md:h-5", isCurrentSongLiked && "fill-current")} />
        </Button>
      </div>

      {/* Progress Bar - Properly contained within the navbar */}
      <div 
        className="absolute bottom-1 left-4 right-4 h-1 bg-black/20 rounded-full overflow-hidden"
      >
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ 
            width: `${Math.min(Math.max(progressPercentage, 0), 100)}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.primary})`
          }}
        />
      </div>
    </div>
  );
}
