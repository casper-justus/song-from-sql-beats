
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { resolveMediaUrl } from '@/utils/mediaCache';
import { useSession } from '@clerk/clerk-react';

export function DynamicBackground() {
  const { currentSong, isPlaying, currentTime } = useMusicPlayer();
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
        if (currentSong.cover_url) {
          console.log('Loading background image for:', currentSong.title);
          const resolvedImageUrl = await resolveMediaUrl(currentSong.cover_url, session, false, 'high');
          if (resolvedImageUrl) {
            setBackgroundImage(resolvedImageUrl);
            const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
            setDominantColors(colors);
            console.log('Background image loaded successfully');
          } else {
            console.log('No resolved image URL, using color scheme');
            setBackgroundImage(null);
            const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
            setDominantColors(colors);
          }
        } else {
          console.log('No cover URL, generating colors from text');
          setBackgroundImage(null);
          const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
          setDominantColors(colors);
        }
      } catch (error) {
        console.error('Error updating background:', error);
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

  const visualizerIntensity = getVisualizerIntensity();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Background Image with strong blur effect */}
      {backgroundImage && (
        <div
          key={currentSong?.id}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 blur-2xl scale-110 transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: 'blur(40px) brightness(0.7)',
          }}
        />
      )}
      
      {/* Dynamic Gradient Overlay */}
      <div
        key={`gradient-${currentSong?.id}`}
        className="absolute inset-0 opacity-90 transition-all duration-1000 ease-in-out"
        style={{
          background: `linear-gradient(135deg, ${dominantColors[0]} 0%, ${dominantColors[1]} 50%, ${dominantColors[2] || '#000000'} 100%)`
        }}
      />
      
      {/* Additional dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      
      {/* Enhanced Audio Visualizer Elements */}
      <div className="absolute inset-0 opacity-20">
        {/* Pulsing circles that react to music */}
        <div 
          className="absolute top-1/4 left-1/4 rounded-full bg-white/30 animate-pulse" 
          style={{ 
            width: `${8 + visualizerIntensity * 8}px`,
            height: `${8 + visualizerIntensity * 8}px`,
            animationDuration: `${2 - visualizerIntensity}s`
          }}
        />
        <div 
          className="absolute top-3/4 right-1/3 rounded-full bg-white/20 animate-pulse" 
          style={{ 
            width: `${4 + visualizerIntensity * 6}px`,
            height: `${4 + visualizerIntensity * 6}px`,
            animationDelay: '1s', 
            animationDuration: `${3 - visualizerIntensity}s`
          }} 
        />
        <div 
          className="absolute bottom-1/4 left-1/2 rounded-full bg-white/25 animate-pulse" 
          style={{ 
            width: `${6 + visualizerIntensity * 7}px`,
            height: `${6 + visualizerIntensity * 7}px`,
            animationDelay: '2s', 
            animationDuration: `${4 - visualizerIntensity}s`
          }} 
        />
        
        {/* Moving light rays */}
        {isPlaying && (
          <>
            <div 
              className="absolute top-0 left-1/3 w-px bg-gradient-to-b from-white/20 to-transparent animate-pulse"
              style={{ 
                height: `${20 + visualizerIntensity * 40}%`,
                animationDuration: '2s'
              }}
            />
            <div 
              className="absolute top-0 right-1/4 w-px bg-gradient-to-b from-white/15 to-transparent animate-pulse"
              style={{ 
                height: `${15 + visualizerIntensity * 35}%`,
                animationDuration: '3s',
                animationDelay: '1s'
              }}
            />
          </>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
