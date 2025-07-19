
import React, { useEffect, useState, useRef } from 'react';
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
    activePlayerRef,
  } = useMusicPlayer();

  const [dominantColor, setDominantColor] = useState('#F9C901');

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && activePlayerRef?.current && !sourceRef.current) {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  if (!currentSong) {
    return null;
  }

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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-24 bg-black/10 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 z-50"
    >
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={96} // h-24
            className="absolute top-0 left-0 w-full -translate-y-full opacity-75"
        />
      {/* Progress Bar at the top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-white transition-all duration-200"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Album Art & Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ResolvedCoverImage
          imageKey={currentSong.cover_url}
          videoId={currentSong.video_id}
          altText={currentSong.title || 'Album cover'}
          className="w-14 h-14 rounded-md object-cover shadow-lg"
        />
        <div className="flex flex-col min-w-0">
          <p className="font-bold text-white truncate">
            {currentSong.title || "Unknown Title"}
          </p>
          <p className="text-sm text-white/70 truncate">
            {currentSong.artist || "Unknown Artist"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={playPrevious}
          className="text-white/80 hover:bg-white/20 rounded-full w-10 h-10"
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="text-white bg-white/20 hover:bg-white/30 rounded-full w-14 h-14"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={playNext}
          className="text-white/80 hover:bg-white/20 rounded-full w-10 h-10"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Right side actions - Spaced out for a cleaner look */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLikeClick}
          className={cn(
            "text-white/70 hover:text-white",
            isCurrentSongLiked && "text-red-500"
          )}
        >
          <Heart className={cn("w-5 h-5", isCurrentSongLiked && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowQueueDialog(true)}
          className="text-white/70 hover:text-white"
        >
          <List className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
