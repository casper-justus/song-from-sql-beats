import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, List } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';
import { NowPlayingModal } from './NowPlayingModal';
import { useIsMobile } from '@/hooks/use-mobile';

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
    seek,
    setShowQueueDialog,
    activePlayerRef,
  } = useMusicPlayer();

  const isMobile = useIsMobile();
  const [dominantColor, setDominantColor] = useState('#1DB954'); // Spotify green as a fallback
  const [showNowPlaying, setShowNowPlaying] = useState(false);

  // Generate dynamic colors based on song info
  useEffect(() => {
    if (currentSong?.cover_url) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = currentSong.cover_url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          r = Math.floor(r / (data.length / 4));
          g = Math.floor(g / (data.length / 4));
          b = Math.floor(b / (data.length / 4));
          setDominantColor(`rgb(${r}, ${g}, ${b})`);
        }
      };
    }
  }, [currentSong]);

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id || '');
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (value: number[]) => {
    if (duration > 0) {
      seek(value[0]);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && activePlayerRef?.current && !sourceRef.current) {
        try {
            const context = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
            const source = context.createMediaElementSource(activePlayerRef.current);
            const analyser = context.createAnalyser();

            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(context.destination);

            audioContextRef.current = context;
            sourceRef.current = source;
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) {
            console.error("Error setting up Web Audio API for visualizer:", e);
        }
    }
  }, [isPlaying, activePlayerRef, currentSong]);

  useEffect(() => {
    const drawVisualizer = () => {
      if (!analyserRef.current || !canvasRef.current || !dataArrayRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(drawVisualizer);
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bufferLength = analyserRef.current.frequencyBinCount;
      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArrayRef.current[i] / 2;
        const mainColor = dominantColor || '#F9C901';
        ctx.fillStyle = mainColor;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationFrameIdRef.current = requestAnimationFrame(drawVisualizer);
    };

    if (isPlaying) {
      drawVisualizer();
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, dominantColor]);

  if (!currentSong) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Enhanced, Seekable Progress Bar */}
      <div className="group relative h-2 bg-transparent -mb-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="absolute inset-0 w-full h-full"
          disabled={!currentSong || duration === 0}
        />
      </div>
      
      {/* Main Player Bar */}
      <div className="h-20 bg-black/20 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-4">
        {/* Audio Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={120}
          className="absolute top-0 left-0 w-full -translate-y-full opacity-60 pointer-events-none"
        />

        {/* Left: Album Art & Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0 md:w-1/4">
          <button 
            onClick={() => setShowNowPlaying(true)}
            className="flex-shrink-0 hover:scale-105 transition-transform duration-200"
          >
            <ResolvedCoverImage
              imageKey={currentSong.cover_url}
              videoId={currentSong.video_id}
              altText={currentSong.title || 'Album cover'}
              className="w-12 h-12 rounded-lg object-cover shadow-xl ring-2 ring-white/10"
            />
          </button>
          <div className="flex flex-col min-w-0">
            <p className="font-semibold text-white text-sm truncate">
              {currentSong.title || "Unknown Title"}
            </p>
            <p className="text-xs text-white/60 truncate">
              {currentSong.artist || "Unknown Artist"}
            </p>
          </div>
          {/* Time display on desktop */}
          <div className="hidden sm:flex text-xs text-white/50 ml-2">
            <span>{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Center: Controls */}
        <div className={cn(
          "flex items-center gap-2 flex-shrink-0 md:mx-4",
          isMobile && "flex-1 justify-end"
        )}>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-9 h-9 transition-all"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="text-white bg-white/15 hover:bg-white/25 rounded-full w-12 h-12 shadow-lg transition-all hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-9 h-9 transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 justify-end md:w-1/4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLikeClick}
            className={cn(
              "rounded-full w-9 h-9 transition-all",
              isCurrentSongLiked
                ? "text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Heart className={cn("w-4 h-4", isCurrentSongLiked && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowQueueDialog(true)}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-full w-9 h-9 transition-all"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Now Playing Modal */}
      <NowPlayingModal 
        open={showNowPlaying} 
        onOpenChange={setShowNowPlaying} 
      />
    </div>
  );
}
