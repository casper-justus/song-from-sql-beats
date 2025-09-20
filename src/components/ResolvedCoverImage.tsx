
import React, { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';

interface ResolvedCoverImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageKey: string | null | undefined;
  videoId?: string | null;
  altText: string;
  placeholderSrc?: string;
  className?: string;
}

// Global cache for resolved URLs to minimize requests
const globalImageCache = new Map<string, string>();

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
 * Extracts the R2 object key from a full Cloudflare R2 public URL.
 * This is now more robust to handle different URL formats.
 */
function extractR2KeyFromUrl(fullR2Url: string): string | null {
  try {
    // Check if the input is a full URL or just a key-like path
    if (fullR2Url.startsWith('http')) {
      const url = new URL(fullR2Url);
      // The object key is the part of the path after the bucket's root.
      // E.g., https://<...>.r2.cloudflarestorage.com/music/artist/album/folder.jpg -> music/artist/album/folder.jpg
      let path = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
      return decodeURIComponent(path);
    } else {
      // It's likely already a key, so just return it after decoding just in case
      return decodeURIComponent(fullR2Url);
    }
  } catch (error) {
    console.error("Failed to parse R2 URL for key extraction:", fullR2Url, error);
    // If parsing fails, it might be a malformed URL or just a key.
    // Let's assume it's a key and return it.
    return fullR2Url;
  }
}

const ResolvedCoverImage: React.FC<ResolvedCoverImageProps> = ({
  imageKey,
  videoId,
  altText,
  placeholderSrc = '/placeholder.svg',
  className,
  ...imgProps
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { session } = useSession();

  useEffect(() => {
    // Priority: YouTube thumbnail > R2 image > placeholder
    if (videoId) {
      // Use YouTube thumbnail to offload traffic
      const youtubeThumb = getYouTubeThumbnail(videoId, 'high');
      setResolvedSrc(youtubeThumb);
      return;
    }

    if (!imageKey) {
      setResolvedSrc(placeholderSrc);
      return;
    }

    // Check global cache first
    if (globalImageCache.has(imageKey)) {
      const cachedUrl = globalImageCache.get(imageKey)!;
      setResolvedSrc(cachedUrl);
      return;
    }

    const fetchImageUrl = async () => {
      if (!session) {
        console.log("No session available for image URL resolution.");
        setResolvedSrc(placeholderSrc);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      
      try {
        const r2Key = extractR2KeyFromUrl(imageKey) || imageKey;
        
        const token = await session.getToken({
          template: 'supabase'
        });

        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Worker request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (data && data.signedUrl) {
          globalImageCache.set(imageKey, data.signedUrl);
          setResolvedSrc(data.signedUrl);
        } else {
          throw new Error("Signed URL not present in worker response");
        }
      } catch (err: any) {
        console.error("Error resolving image URL for key:", imageKey, err.message);
        setHasError(true);
        // CRITICAL FIX: Explicitly set to placeholder on ANY error in the process.
        setResolvedSrc(placeholderSrc);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [imageKey, videoId, session, placeholderSrc]);

  const handleImageError = () => {
    console.log("Image failed to load, using placeholder for:", imageKey || videoId);
    setHasError(true);
    setResolvedSrc(placeholderSrc);
  };

  if (isLoading && !resolvedSrc) {
    return (
      <div 
        className={`${className} bg-gray-700 animate-pulse flex items-center justify-center`}
        style={{ width: imgProps.width, height: imgProps.height }}
      >
        <span className="text-gray-400 text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc || placeholderSrc}
      alt={altText}
      className={className}
      onError={handleImageError}
      {...imgProps}
    />
  );
};

export default ResolvedCoverImage;
