
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { resolveMediaUrl } from '@/utils/mediaCache';
import { useSession } from '@clerk/clerk-react';

export function DynamicBackground() {
  const { currentSong } = useMusicPlayer();
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
            // Generate colors based on song info for fallback
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
      {/* Background Image with strong blur effect */}
      {backgroundImage && (
        <div
          key={currentSong?.id} // Force re-render when song changes
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 blur-2xl scale-110 transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: 'blur(40px) brightness(0.7)',
          }}
        />
      )}
      
      {/* Gradient Overlay that changes based on song */}
      <div
        key={`gradient-${currentSong?.id}`}
        className="absolute inset-0 opacity-90 transition-all duration-1000 ease-in-out"
        style={{
          background: `linear-gradient(135deg, ${dominantColors[0]} 0%, ${dominantColors[1]} 50%, #000000 100%)`
        }}
      />
      
      {/* Additional dark overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      
      {/* Subtle animated elements for visual interest */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-pulse" 
          style={{ animationDuration: '3s' }}
        />
        <div 
          className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/20 rounded-full animate-pulse" 
          style={{ animationDelay: '1s', animationDuration: '4s' }} 
        />
        <div 
          className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse" 
          style={{ animationDelay: '2s', animationDuration: '5s' }} 
        />
      </div>

      {/* Loading indicator when switching tracks */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
