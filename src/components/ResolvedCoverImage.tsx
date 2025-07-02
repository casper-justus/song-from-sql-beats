
import React, { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';

interface ResolvedCoverImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageKey: string | null | undefined;
  altText: string;
  placeholderSrc?: string;
  className?: string;
}

// Global cache for resolved URLs to minimize requests
const globalImageCache = new Map<string, string>();

/**
 * Extracts the R2 object key from a full Cloudflare R2 public URL.
 */
function extractR2KeyFromUrl(fullR2Url: string): string | null {
  try {
    const url = new URL(fullR2Url);
    let path = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    return decodeURIComponent(path);
  } catch (error) {
    console.error("Failed to parse R2 URL for key extraction:", fullR2Url, error);
    return null;
  }
}

const ResolvedCoverImage: React.FC<ResolvedCoverImageProps> = ({
  imageKey,
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
          console.error('Image fetch error:', response.status, errorText);
          throw new Error(`Failed to resolve image URL: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.signedUrl) {
          // Cache the resolved URL globally
          globalImageCache.set(imageKey, data.signedUrl);
          setResolvedSrc(data.signedUrl);
        } else {
          throw new Error("Signed URL not found in response");
        }
      } catch (err: any) {
        console.error("Error resolving image URL for key:", imageKey, err);
        setHasError(true);
        setResolvedSrc(placeholderSrc);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [imageKey, session, placeholderSrc]);

  const handleImageError = () => {
    console.log("Image failed to load, using placeholder for:", imageKey);
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
