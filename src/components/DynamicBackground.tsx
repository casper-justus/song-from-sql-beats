
import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useSession } from '@clerk/clerk-react';
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
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [isLoadingColor, setIsLoadingColor] = useState(false);

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

  useEffect(() => {
    if (!imageUrl) {
      setDominantColor(null);
      return;
    }

    setIsLoadingColor(true);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setIsLoadingColor(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }

        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const saturationBoost = brightness < 128 ? 1.3 : 1.1;

        r = Math.min(255, Math.floor(r * saturationBoost));
        g = Math.min(255, Math.floor(g * saturationBoost));
        b = Math.min(255, Math.floor(b * saturationBoost));

        setDominantColor(`rgb(${r}, ${g}, ${b})`);
        setIsLoadingColor(false);
      } catch (error) {
        console.error('Error extracting color:', error);
        setDominantColor(null);
        setIsLoadingColor(false);
      }
    };

    img.onerror = () => {
      setIsLoadingColor(false);
      setDominantColor(null);
    };
  }, [imageUrl]);

  const gradient = dominantColor
    ? `linear-gradient(135deg, ${dominantColor} 0%, #000000 100%)`
    : 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {imageUrl ? (
        <>
          <div
            key={imageUrl}
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${imageUrl})`,
              filter: 'blur(32px) brightness(0.6)',
              transform: 'scale(1.1)',
            }}
          />
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{ background: gradient, opacity: 0.8 }}
          />
        </>
      ) : (
        <FallbackBg />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      {isLoadingColor && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
