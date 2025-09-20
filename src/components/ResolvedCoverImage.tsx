import React, { useState, useEffect } from 'react';

interface ResolvedCoverImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  // imageKey is no longer used for R2, but kept for component signature stability
  imageKey: string | null | undefined;
  videoId?: string | null;
  altText: string;
  placeholderSrc?: string;
  className?: string;
}

/**
 * Gets YouTube thumbnail URL from video ID
 */
function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  const qualityOptions = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg', 
    high: 'hqdefault.jpg',
    standard: 'sddefault.jpg',
    maxres: 'maxresdefault.jpg'
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityOptions[quality]}`;
}

/**
 * A component that displays a cover image.
 * It prioritizes YouTube thumbnails if a videoId is available.
 * Otherwise, it shows a placeholder. R2 image loading has been removed as requested.
 */
const ResolvedCoverImage: React.FC<ResolvedCoverImageProps> = ({
  videoId,
  altText,
  placeholderSrc = '/placeholder.svg',
  className,
  ...imgProps
}) => {
  const [src, setSrc] = useState<string>(placeholderSrc);

  useEffect(() => {
    if (videoId) {
      const youtubeThumb = getYouTubeThumbnail(videoId, 'high');
      setSrc(youtubeThumb);
    } else {
      setSrc(placeholderSrc);
    }
  }, [videoId, placeholderSrc]);

  const handleImageError = () => {
    // If the YouTube thumbnail fails, fall back to the placeholder
    setSrc(placeholderSrc);
  };

  return (
    <img
      src={src}
      alt={altText}
      className={className}
      onError={handleImageError}
      {...imgProps}
    />
  );
};

export default ResolvedCoverImage;
