
import React, { useRef, useEffect, useState } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export function AudioVisualizer() {
  const { audioRef, isPlaying, currentSong } = useMusicPlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    if (!audioRef?.current || !currentSong) return;

    const setupAudioContext = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioRef.current!);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        setIsSetup(true);
        
        return () => {
          source.disconnect();
          analyser.disconnect();
          audioContext.close();
        };
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    };

    if (!isSetup) {
      const cleanup = setupAudioContext();
      return cleanup;
    }
  }, [audioRef, currentSong, isSetup]);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !dataArrayRef.current || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)'); // Green
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)'); // Blue
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.4)'); // Purple
      
      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.7;
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  if (!currentSong) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-60">
      <canvas
        ref={canvasRef}
        width={800}
        height={64}
        className="w-full h-full"
        style={{ filter: 'blur(0.5px)' }}
      />
    </div>
  );
}

export default AudioVisualizer;
