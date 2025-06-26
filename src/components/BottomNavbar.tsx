import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage'; // Import the new component

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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md h-16 rounded-full shadow-xl flex items-center justify-center px-4"
             style={{ backgroundColor: '#F9C901' }}>
            <p className="text-gray-700 text-sm">No music selected</p>
        </div>
    );
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-lg h-20 rounded-full shadow-2xl flex items-center justify-between px-3 md:px-6 space-x-2 z-50"
      style={{ backgroundColor: '#F9C901' }}
    >
      {/* Album Art & Info */}
      <div className="flex items-center space-x-3 flex-shrink min-w-0">
        <ResolvedCoverImage
          imageKey={currentSong.cover_url} // This is now a key
          altText={currentSong.title || 'Album cover'}
          className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white/50"
        />
        <div className="flex flex-col min-w-0">
          <p className="text-sm md:text-base font-semibold text-gray-800 truncate">{currentSong.title || "Unknown Title"}</p>
          <p className="text-xs md:text-sm text-gray-600 truncate">{currentSong.artist || "Unknown Artist"}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={playPrevious} className="text-gray-700 hover:bg-black/10 rounded-full w-8 h-8 md:w-10 md:h-10">
          <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={togglePlay} className="text-gray-700 hover:bg-black/10 rounded-full w-10 h-10 md:w-12 md:h-12">
          {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={playNext} className="text-gray-700 hover:bg-black/10 rounded-full w-8 h-8 md:w-10 md:h-10">
          <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      {/* Like Button - Placed to the right of controls, or adjust layout as needed */}
      <div className="flex-shrink-0 ml-2 md:ml-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLikeClick}
          className={cn(
            "text-gray-700 hover:bg-black/10 rounded-full w-8 h-8 md:w-10 md:h-10",
            isCurrentSongLiked && "text-spotifyGreen" // Use a distinct color for liked state
          )}
        >
          <Heart className={cn("w-4 h-4 md:w-5 md:h-5", isCurrentSongLiked && "fill-current")} />
        </Button>
      </div>

      {/* Progress Bar (simple version) - Hidden on small screens to save space */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-50 hidden md:block">
        <div
          className="h-full rounded-b-full"
          style={{ width: `${progressPercentage}%`, backgroundColor: '#8A2BE2' /* A contrasting purple */ }}
        />
      </div>
    </div>
  );
}
