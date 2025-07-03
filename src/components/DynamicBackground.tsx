
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { resolveMediaUrl } from '@/utils/mediaCache';
import { useSession } from '@clerk/clerk-react';

export function DynamicBackground() {
  const { currentSong } = useMusicPlayer();
  const { session } = useSession();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [dominantColors, setDominantColors] = useState<string[]>(['#1a1a1a', '#2a2a2a']);

  useEffect(() => {
    const updateBackground = async () => {
      if (!currentSong || !session) {
        setBackgroundImage(null);
        setDominantColors(['#1a1a1a', '#2a2a2a']);
        return;
      }

      try {
        if (currentSong.cover_url) {
          const resolvedImageUrl = await resolveMediaUrl(currentSong.cover_url, session, false, 'high');
          if (resolvedImageUrl) {
            setBackgroundImage(resolvedImageUrl);
            // Extract colors would go here in a real implementation
            // For now, using theme-appropriate colors
            setDominantColors(['#2563eb', '#1e40af']);
          }
        } else {
          setBackgroundImage(null);
          // Generate colors based on song info
          const colors = generateColorsFromText(currentSong.title + (currentSong.artist || ''));
          setDominantColors(colors);
        }
      } catch (error) {
        console.error('Error updating background:', error);
        setBackgroundImage(null);
        setDominantColors(['#1a1a1a', '#2a2a2a']);
      }
    };

    updateBackground();
  }, [currentSong, session]);

  const generateColorsFromText = (text: string): string[] => {
    // Simple hash-based color generation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360;
    
    return [
      `hsl(${hue1}, 70%, 25%)`,
      `hsl(${hue2}, 60%, 20%)`
    ];
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Background Image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 blur-3xl scale-110 transition-all duration-1000"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />
      )}
      
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-90 transition-all duration-1000"
        style={{
          background: `linear-gradient(135deg, ${dominantColors[0]} 0%, ${dominantColors[1]} 50%, #000000 100%)`
        }}
      />
      
      {/* Additional Gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      
      {/* Animated particles/dots for visual interest */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}
