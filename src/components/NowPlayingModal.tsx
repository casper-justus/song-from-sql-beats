import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, List, MoreVertical, Download, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface NowPlayingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NowPlayingModal({ open, onOpenChange }: NowPlayingModalProps) {
  const {
    currentSong,
    isPlaying,
    isShuffle,
    currentTime,
    duration,
    isCurrentSongLiked,
    toggleLikeSong,
    togglePlay,
    toggleShuffle,
    playNext,
    playPrevious,
    seek,
    setShowQueueDialog,
    activePlayerRef,
  } = useMusicPlayer();

  const [dominantColor, setDominantColor] = useState('#F9C901');
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Generate dynamic colors based on album art
  useEffect(() => {
    if (!currentSong || !open) return;

    const extractColor = async () => {
      try {
        const imgElement = document.querySelector(`img[alt="${currentSong.title || 'Album cover'}"]`) as HTMLImageElement;

        if (imgElement && imgElement.complete) {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.width = imgElement.naturalWidth || 100;
            canvas.height = imgElement.naturalHeight || 100;
            context.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let r = 0, g = 0, b = 0;
            const pixelCount = data.length / 4;

            for (let i = 0; i < data.length; i += 4) {
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
            }

            r = Math.floor(r / pixelCount);
            g = Math.floor(g / pixelCount);
            b = Math.floor(b / pixelCount);

            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const saturationBoost = brightness < 128 ? 1.5 : 1.2;

            r = Math.min(255, Math.floor(r * saturationBoost));
            g = Math.min(255, Math.floor(g * saturationBoost));
            b = Math.min(255, Math.floor(b * saturationBoost));

            setDominantColor(`rgb(${r}, ${g}, ${b})`);
          }
        }
      } catch (error) {
        console.error('Error extracting color:', error);
        setDominantColor('#F9C901');
      }
    };

    const timeoutId = setTimeout(extractColor, 100);
    return () => clearTimeout(timeoutId);
  }, [currentSong, open]);

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id || '');
    }
  };

  const handleProgressBarInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const newTime = Math.max(0, Math.min((clickX / rect.width) * duration, duration));
    seek(newTime);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleProgressBarInteraction(e);
  };

  const handleProgressBarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressBarInteraction(e);
  };

  const handleProgressBarTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleProgressBarInteraction(e);
    }
  };

  const handleProgressBarTouchEnd = () => {
    setIsDragging(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-full sm:h-auto bg-gray-900 border-gray-700 p-0 overflow-hidden">
        <div 
          className="relative h-full flex flex-col"
          style={{
            background: `linear-gradient(135deg, ${dominantColor}20, rgba(0,0,0,0.8))`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <DialogTitle className="text-lg font-semibold text-white">Now Playing</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>
                This modal displays the currently playing song with controls for playback, liking, and more.
              </DialogDescription>
            </VisuallyHidden>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQueueDialog(true)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <List className="w-5 h-5" />
            </Button>
          </div>

          {/* Album Art */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative">
              <ResolvedCoverImage
                imageKey={currentSong.cover_url}
                videoId={currentSong.video_id}
                altText={currentSong.title || 'Album cover'}
                className="w-72 h-72 rounded-2xl object-cover shadow-2xl ring-4 ring-white/10"
              />
              <div 
                className="absolute inset-0 rounded-2xl shadow-2xl"
                style={{
                  boxShadow: `0 25px 50px -12px ${dominantColor}40`,
                }}
              />
            </div>

            {/* Song Info */}
            <div className="text-center mt-8 px-4">
              <h1 className="text-2xl font-bold text-white mb-2 truncate max-w-full">
                {currentSong.title || "Unknown Title"}
              </h1>
              <p className="text-lg text-white/70 truncate">
                {currentSong.artist || "Unknown Artist"}
              </p>
              {currentSong.album && (
                <p className="text-sm text-white/50 mt-1 truncate">
                  {currentSong.album}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full mt-8 px-4">
              <div
                ref={progressBarRef}
                className="relative h-2 bg-white/20 rounded-full cursor-pointer group touch-none"
                onClick={handleProgressBarClick}
                onTouchStart={handleProgressBarTouchStart}
                onTouchMove={handleProgressBarTouchMove}
                onTouchEnd={handleProgressBarTouchEnd}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-200"
                  style={{ width: `${progressPercentage}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progressPercentage}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <div className="flex justify-between text-sm text-white/60 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={cn(
                  "w-12 h-12",
                  isShuffle
                    ? "text-green-400 hover:text-green-300 bg-green-500/20 hover:bg-green-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Shuffle className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={playPrevious}
                className="text-white hover:bg-white/10 w-12 h-12"
              >
                <SkipBack className="w-6 h-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white bg-white/20 hover:bg-white/30 w-16 h-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: `${dominantColor}40`,
                }}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={playNext}
                className="text-white hover:bg-white/10 w-12 h-12"
              >
                <SkipForward className="w-6 h-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10 w-12 h-12"
              >
                <Repeat className="w-5 h-5" />
              </Button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-center gap-8 mt-8 w-full px-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLikeClick}
                className={cn(
                  "w-10 h-10 rounded-full",
                  isCurrentSongLiked 
                    ? "text-red-400 hover:text-red-300 bg-red-500/20 hover:bg-red-500/30" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Heart className={cn("w-5 h-5", isCurrentSongLiked && "fill-current")} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/60 hover:text-white hover:bg-white/10 w-10 h-10 rounded-full"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
                  <DropdownMenuItem className="hover:bg-gray-700 cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}