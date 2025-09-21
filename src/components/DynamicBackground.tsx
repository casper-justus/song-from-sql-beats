
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useSession } from '@clerk/clerk-react';
import { useColor } from 'color-thief-react';
import { resolveMediaUrl } from '@/utils/mediaCache';

const getYouTubeThumbnailUrl = (videoId: string) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

const FallbackBg = () => (
  <>
    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
  </>
);

export function DynamicBackground() {
  const { currentSong } = useMusicPlayer();
  const { session } = useSession();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const getImageUrl = async () => {
      if (!currentSong || !session) {
        setImageUrl(null);
        return;
      }
      
      let url: string | null = null;
      if (currentSong.video_id) {
        url = getYouTubeThumbnailUrl(currentSong.video_id);
      } else if (currentSong.cover_url) {
        url = await resolveMediaUrl(currentSong.cover_url, session, false, 'high');
      }
      setImageUrl(url);
    };

    getImageUrl();
  }, [currentSong, session]);

  const { data: dominantColor, loading: isLoadingColor } = useColor(imageUrl, 'rgbString', {
    crossOrigin: 'anonymous',
    quality: 10,
  });

  const gradient = dominantColor
    ? `linear-gradient(135deg, ${dominantColor} 0%, #000000 100%)`
    : 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {imageUrl ? (
        <>
          {/* Blurred Background Image */}
          <div
            key={imageUrl}
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${imageUrl})`,
              filter: 'blur(32px) brightness(0.6)',
              transform: 'scale(1.1)',
            }}
          />
          {/* Dynamic Gradient Overlay */}
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{ background: gradient, opacity: 0.8 }}
          />
        </>
      ) : (
        <FallbackBg />
      )}
      
      {/* Additional dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      {/* Loading Indicator */}
      {isLoadingColor && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
