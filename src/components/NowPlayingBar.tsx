
import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, List, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useSession } from '@clerk/clerk-react';
import ResolvedCoverImage from './ResolvedCoverImage';
import { downloadManager } from '@/utils/downloadManager';
import DownloadManager from './DownloadManager';

export function NowPlayingBar() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isCurrentSongLiked,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setVolumeLevel,
    setShowQueueDialog,
    toggleLikeSong
  } = useMusicPlayer();

  const { session } = useSession();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  if (!currentSong) return null;

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolumeLevel(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolumeLevel(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolumeLevel(0);
      setIsMuted(true);
    }
  };

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id || '');
    }
  };

  const handleDownload = async () => {
    if (currentSong && session) {
      await downloadManager.downloadSong(currentSong, session);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Generate dynamic colors based on current song
  const generateDynamicColors = (title: string, artist: string) => {
    let hash = 0;
    const text = title + artist;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return {
      primary: `hsl(${hue}, 70%, 50%)`,
      secondary: `hsl(${(hue + 30) % 360}, 60%, 40%)`,
      background: `hsl(${hue}, 30%, 15%)`
    };
  };

  const colors = generateDynamicColors(currentSong.title || '', currentSong.artist || '');

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${colors.background}E6, rgba(0,0,0,0.9))`,
        borderColor: `${colors.primary}40`
      }}
    >
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-800 relative overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
          }}
        />
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          disabled={!currentSong || duration === 0}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Song info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-lg overflow-hidden shadow-lg bg-gray-700 flex-shrink-0">
            <ResolvedCoverImage
              imageKey={currentSong.cover_url}
              videoId={currentSong.video_id}
              altText={currentSong.title || 'Song cover'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white truncate text-sm">
              {currentSong.title || "Unknown Title"}
            </p>
            <p className="text-gray-300 text-xs truncate">
              {currentSong.artist}
              {currentSong.album && (
                <span className="mx-1 text-gray-500">•</span>
              )}
              {currentSong.album && (
                <span className="text-gray-400">{currentSong.album}</span>
              )}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLikeClick}
            className={cn(
              "w-8 h-8 text-gray-400 hover:text-white transition-colors",
              isCurrentSongLiked && "text-red-500 hover:text-red-400"
            )}
          >
            <Heart className={cn("h-4 w-4", isCurrentSongLiked && "fill-current")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={playPrevious}
            className="w-8 h-8 text-gray-300 hover:text-white transition-colors"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="w-10 h-10 text-white hover:bg-white/10 transition-all"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            className="w-8 h-8 text-gray-300 hover:text-white transition-colors"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowQueueDialog(true)}
            className="w-8 h-8 text-gray-400 hover:text-white transition-colors"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
          <div className="text-xs text-gray-400 hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="w-8 h-8 text-gray-400 hover:text-white transition-colors"
          >
            <Download className="h-4 w-4" />
          </Button>

          <DownloadManager />

          {/* Volume control */}
          <div 
            className="flex items-center gap-2 relative"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="w-8 h-8 text-gray-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            {showVolumeSlider && (
              <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-900/95 backdrop-blur rounded-lg shadow-xl border border-gray-700">
                <div className="w-20 h-24 flex flex-col items-center">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    orientation="vertical"
                    className="h-16"
                  />
                  <span className="text-xs text-gray-400 mt-2">{Math.round(isMuted ? 0 : volume)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NowPlayingBar;
