
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { resolveMediaUrl } from '@/utils/mediaCache';
import { useSession } from '@clerk/clerk-react';
import { AudioVisualizer } from './AudioVisualizer';

export function DynamicBackground() {
  const { currentSong, isPlaying } = useMusicPlayer();
  const { session } = useSession();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [dominantColors, setDominantColors] = useState<string[]>(['#1a1a1a', '#2a2a2a', '#3a3a3a']);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateBackground = async () => {
      if (!currentSong || !session) {
        setBackgroundImage(null);
        setDominantColors(['#1a1a1a', '#2a2a2a', '#3a3a3a']);
        return;
      }

      setIsLoading(true);
      
      try {
        if (currentSong.cover_url) {
          console.log('Loading background image for:', currentSong.title);
          const resolvedImageUrl = await resolveMediaUrl(currentSong.cover_url, session, false, 'high');
          if (resolvedImageUrl) {
            setBackgroundImage(resolvedImageUrl);
            // Generate enhanced colors based on song info
            const colors = generateEnhancedColorsFromText(currentSong.title + (currentSong.artist || '') + (currentSong.album || ''));
            setDominantColors(colors);
            console.log('Background image loaded successfully');
          } else {
            console.log('No resolved image URL, using color scheme');
            setBackgroundImage(null);
            const colors = generateEnhancedColorsFromText(currentSong.title + (currentSong.artist || ''));
            setDominantColors(colors);
          }
        } else {
          console.log('No cover URL, generating colors from text');
          setBackgroundImage(null);
          const colors = generateEnhancedColorsFromText(currentSong.title + (currentSong.artist || ''));
          setDominantColors(colors);
        }
      } catch (error) {
        console.error('Error updating background:', error);
        setBackgroundImage(null);
        setDominantColors(['#1a1a1a', '#2a2a2a', '#3a3a3a']);
      } finally {
        setIsLoading(false);
      }
    };

    updateBackground();
  }, [currentSong, session]);

  const generateEnhancedColorsFromText = (text: string): string[] => {
    // Enhanced hash-based color generation with better variety
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const baseHue = Math.abs(hash) % 360;
    const complementaryHue = (baseHue + 180) % 360;
    const triadicHue1 = (baseHue + 120) % 360;
    const triadicHue2 = (baseHue + 240) % 360;
    
    return [
      `hsl(${baseHue}, 70%, 25%)`,
      `hsl(${complementaryHue}, 60%, 20%)`,
      `hsl(${triadicHue1}, 65%, 22%)`,
      `hsl(${triadicHue2}, 55%, 18%)`
    ];
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Background Image with ultra-blur effect */}
      {backgroundImage && (
        <div
          key={`bg-${currentSong?.id}`}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 blur-3xl scale-110 transition-all duration-2000 ease-in-out"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: 'blur(60px) brightness(0.6) saturate(1.2)',
            transform: 'scale(1.1) rotate(0.5deg)',
          }}
        />
      )}
      
      {/* Enhanced Multi-layer Gradient Overlay */}
      <div
        key={`gradient-1-${currentSong?.id}`}
        className="absolute inset-0 opacity-85 transition-all duration-2000 ease-in-out"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${dominantColors[0]} 0%, transparent 50%), 
                      radial-gradient(ellipse at 70% 80%, ${dominantColors[1]} 0%, transparent 50%),
                      linear-gradient(135deg, ${dominantColors[2]} 0%, ${dominantColors[3]} 50%, #000000 100%)`
        }}
      />
      
      {/* Secondary animated gradient for depth */}
      <div
        key={`gradient-2-${currentSong?.id}`}
        className="absolute inset-0 opacity-60 transition-all duration-3000 ease-in-out"
        style={{
          background: `conic-gradient(from 45deg at 25% 75%, ${dominantColors[0]}22 0deg, ${dominantColors[1]}22 90deg, ${dominantColors[2]}22 180deg, ${dominantColors[3]}22 270deg, ${dominantColors[0]}22 360deg)`,
          animation: isPlaying ? 'pulse 8s ease-in-out infinite' : 'none'
        }}
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
      
      {/* Enhanced animated particles */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              top: `${20 + (i * 15)}%`,
              left: `${10 + (i * 15)}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + (i % 3)}s`,
              opacity: isPlaying ? 0.4 : 0.2,
              filter: `hue-rotate(${i * 60}deg)`
            }}
          />
        ))}
        
        {/* Floating orbs */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full blur-sm"
            style={{
              width: `${20 + i * 10}px`,
              height: `${20 + i * 10}px`,
              background: `radial-gradient(circle, ${dominantColors[i % dominantColors.length]}40 0%, transparent 70%)`,
              top: `${30 + i * 25}%`,
              right: `${15 + i * 20}%`,
              animation: isPlaying ? `float ${6 + i * 2}s ease-in-out infinite` : 'none',
              animationDelay: `${i * 1.5}s`
            }}
          />
        ))}
      </div>

      {/* Audio Visualizer */}
      <AudioVisualizer />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-50">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(90deg); }
            50% { transform: translateY(-40px) rotate(180deg); }
            75% { transform: translateY(-20px) rotate(270deg); }
          }
        `}
      </style>
    </div>
  );
}
