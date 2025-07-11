
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { resolveMediaUrl } from '@/utils/mediaCache';
import { useSession } from '@clerk/clerk-react';

export function DynamicBackground() {
  const { currentSong, isPlaying, currentTime, audioRef } = useMusicPlayer(); // Added audioRef
  const { session } = useSession();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [dominantColors, setDominantColors] = useState<string[]>(['#1a1a1a', '#2a2a2a']);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateBackground = async () => {
      if (!currentSong || !session) {
        setBackgroundImage(null);
        setDominantColors(['#1a1a1a', '#2a2a2a']);
        return;
      }

      setIsLoading(true);
      
      try {
        console.log('[DynamicBackground] currentSong:', currentSong);
        if (currentSong.cover_url) {
          console.log('[DynamicBackground] Loading background image for:', currentSong.title, 'Cover URL:', currentSong.cover_url);
          const resolvedImageUrl = await resolveMediaUrl(currentSong.cover_url, session, false, 'high');
          console.log('[DynamicBackground] Resolved image URL:', resolvedImageUrl);
          if (resolvedImageUrl) {
            setBackgroundImage(resolvedImageUrl);
            const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
            setDominantColors(colors);
            console.log('[DynamicBackground] Background image loaded successfully. Dominant colors:', colors);
          } else {
            console.log('[DynamicBackground] No resolved image URL, using color scheme');
            setBackgroundImage(null);
            const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
            setDominantColors(colors);
            console.log('[DynamicBackground] Fallback dominant colors:', colors);
          }
        } else {
          console.log('[DynamicBackground] No cover URL, generating colors from text');
          setBackgroundImage(null);
          const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
          setDominantColors(colors);
          console.log('[DynamicBackground] Fallback dominant colors (no cover_url):', colors);
        }
      } catch (error) {
        console.error('[DynamicBackground] Error updating background:', error);
        setBackgroundImage(null);
        setDominantColors(['#1a1a1a', '#2a2a2a']);
      } finally {
        setIsLoading(false);
      }
    };

    updateBackground();
  }, [currentSong, session]);

  const generateColorsFromText = (text: string): string[] => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360;
    const hue3 = (hue1 + 120) % 360;
    
    return [
      `hsl(${hue1}, 70%, 25%)`,
      `hsl(${hue2}, 60%, 20%)`,
      `hsl(${hue3}, 65%, 22%)`
    ];
  };

  // Audio visualizer effect based on playing state and time
  const getVisualizerIntensity = () => {
    if (!isPlaying) return 0.3;
    // Simulate audio intensity based on time (in real app, you'd use actual audio data)
    const intensity = 0.5 + Math.sin(currentTime * 2) * 0.3 + Math.cos(currentTime * 1.5) * 0.2;
    return Math.max(0.2, Math.min(1, intensity));
  };

  // const visualizerIntensity = getVisualizerIntensity(); // Old simulated visualizer

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const sourceRef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = React.useRef<Uint8Array | null>(null);
  const animationFrameIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && audioRef?.current && currentSong && !audioContextRef.current) {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;
        analyserRef.current = context.createAnalyser();
        analyserRef.current.fftSize = 256; // Determines number of bars (fftSize/2)

        // Check if sourceRef already exists and disconnect it to avoid multiple sources for the same element
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        sourceRef.current = context.createMediaElementSource(audioRef.current);

        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(context.destination); // Connect analyser to output to hear sound

        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      } catch (e) {
        console.error("Error setting up Web Audio API for visualizer:", e);
        // Fallback or disable visualizer if setup fails
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        sourceRef.current = null;
        return;
      }
    } else if (!isPlaying && audioContextRef.current) {
      // Clean up Web Audio API resources when not playing or song changes
      // audioContextRef.current.close().catch(console.error); // Closing context stops audio playback abruptly.
      // Instead, just disconnect the nodes if we want to keep the context for next play.
      // For simplicity now, we'll rely on full re-init on next play.
      // If currentSong is null, it means playback stopped, so cleanup.
      if (!currentSong && audioContextRef.current) {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
        // audioContextRef.current.close().catch(console.error); // This might be too aggressive if just pausing
        audioContextRef.current = null; // Signal to re-init
        analyserRef.current = null;
        sourceRef.current = null;
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
      }
    }

    // Cleanup function
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      // Consider more robust cleanup if context/nodes persist across song changes
      // For now, this effect re-runs on isPlaying or currentSong change
    };
  }, [isPlaying, currentSong, audioRef]);


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
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArrayRef.current[i] * (canvas.height / 255) * 0.8; // Scale bar height

        // Simple white bars for now
        ctx.fillStyle = `rgba(255, 255, 255, ${barHeight / canvas.height * 1.5 + 0.2})`; // Opacity based on height
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1; // Bar width + spacing
      }
      animationFrameIdRef.current = requestAnimationFrame(drawVisualizer);
    };

    if (isPlaying && analyserRef.current) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      drawVisualizer();
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      // Optionally clear canvas when not playing
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, currentSong]); // Re-run draw loop setup if isPlaying or song changes

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Background Image with strong blur effect */}
      {backgroundImage && (
        <div
          key={currentSong?.id}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 transition-all duration-1000 ease-in-out" // Removed opacity-30, blur-2xl
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: 'blur(32px) brightness(0.6)', // Consolidated filter
            opacity: 0.6, // Increased base opacity of the image
          }}
        />
      )}
      
      {/* Dynamic Gradient Overlay - Toned down */}
      <div
        key={`gradient-${currentSong?.id}`}
        className="absolute inset-0 transition-all duration-1000 ease-in-out"
        style={{
          background: `linear-gradient(135deg, ${dominantColors[0]} 0%, ${dominantColors[1]} 50%, ${dominantColors[2] || '#000000'} 100%)`,
          opacity: 0.3, // Reduced opacity
        }}
      />
      
      {/* Additional dark overlay for text readability - Toned down */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30" />
      
      {/* Real Audio Visualizer Canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth} // Set initial width
        height={150} // Set initial height (can be adjusted)
        className="absolute bottom-0 left-0 w-full opacity-50" // Positioned at the bottom
        style={{ height: '150px' }} // Explicit height
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
