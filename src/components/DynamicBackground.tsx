
import React, { useState, useEffect, useRef } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { resolveMediaUrl } from '@/utils/mediaCache';
import { useSession } from '@clerk/clerk-react';

const getYouTubeThumbnailUrl = (videoId: string) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

const extractColorsFromImage = (imageUrl: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        return reject(new Error('Could not get canvas context'));
      }

      // Draw the image onto a 1x1 canvas to get the average color
      canvas.width = 1;
      canvas.height = 1;
      context.drawImage(img, 0, 0, 1, 1);

      const data = context.getImageData(0, 0, 1, 1).data;
      const r = data[0];
      const g = data[1];
      const b = data[2];

      const avgColor = `rgb(${r},${g},${b})`;

      // Generate a simple gradient from the average color
      const secondaryColor = `rgb(${Math.max(0, r-40)}, ${Math.max(0, g-40)}, ${Math.max(0, b-40)})`;
      const tertiaryColor = `rgb(${Math.max(0, r-60)}, ${Math.max(0, g-60)}, ${Math.max(0, b-60)})`;

      resolve([avgColor, secondaryColor, tertiaryColor]);
    };
    img.onerror = (err) => reject(err);
  });
};


export function DynamicBackground() {
  const { currentSong, isPlaying, currentTime, activePlayerRef } = useMusicPlayer();
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
        let imageUrl: string | null = null;
        if (currentSong.video_id) {
            imageUrl = getYouTubeThumbnailUrl(currentSong.video_id);
        } else if (currentSong.cover_url) {
            imageUrl = await resolveMediaUrl(currentSong.cover_url, session, false, 'high');
        }

        if (imageUrl) {
          setBackgroundImage(imageUrl);
          try {
            const colors = await extractColorsFromImage(imageUrl);
            setDominantColors(colors);
          } catch (e) {
            console.error("Error extracting colors, falling back.", e);
            setDominantColors(['#1a1a1a', '#2a2a2a']); // Fallback
          }
        } else {
          setBackgroundImage(null);
          setDominantColors(['#1a1a1a', '#2a2a2a']); // Fallback
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

  // Audio visualizer effect based on playing state and time
  const getVisualizerIntensity = () => {
    if (!isPlaying) return 0.3;
    // Simulate audio intensity based on time (in real app, you'd use actual audio data)
    const intensity = 0.5 + Math.sin(currentTime * 2) * 0.3 + Math.cos(currentTime * 1.5) * 0.2;
    return Math.max(0.2, Math.min(1, intensity));
  };

  // const visualizerIntensity = getVisualizerIntensity(); // Old simulated visualizer

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
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
