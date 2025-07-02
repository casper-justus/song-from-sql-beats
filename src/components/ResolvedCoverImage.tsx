
import React, { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';

interface ResolvedCoverImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageKey: string | null | undefined;
  altText: string;
  placeholderSrc?: string;
  className?: string;
}

const imageCache = new Map<string, string>();

/**
 * Extracts the R2 object key from a full Cloudflare R2 public URL.
 * Assumes the URL format: https://[account_id].r2.cloudflarestorage.com/[bucket_name]/[object_key]
 * This function handles URL-encoded characters.
 *
 * @param {string} fullR2Url The complete R2 public URL.
 * @returns {string|null} The R2 object key (e.g., "music/music/song.mp3") or null if invalid format.
 */
function extractR2KeyFromUrl(fullR2Url: string): string | null {
  try {
    const url = new URL(fullR2Url);
    // The pathname will be something like "/[bucket_name]/[object_key]"
    // We remove the leading slash to get the R2 object key.
    let path = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    return decodeURIComponent(path); // Decode any URL-encoded characters (e.g., %20 to space)
  } catch (error) {
    console.error("Failed to parse R2 URL for key extraction in Edge Function:", fullR2Url, error);
    return null; // Return null if the URL is invalid or cannot be parsed
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
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession();

  useEffect(() => {
    if (!imageKey) {
      setResolvedSrc(placeholderSrc);
      return;
    }

    if (imageCache.has(imageKey)) {
      setResolvedSrc(imageCache.get(imageKey)!);
      return;
    }

    const fetchImageUrl = async () => {
      if (!session) {
        setError("Authentication session not available.");
        setResolvedSrc(placeholderSrc);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Extract R2 key from the full URL if needed
        const r2Key = extractR2KeyFromUrl(imageKey) || imageKey;
        
        // Get the Clerk JWT token with RS256 format using the supabase template
        const token = await session.getToken({
          template: 'supabase'
        });

        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        // Validate token format
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Image token payload preview:', { sub: payload.sub, iat: payload.iat, exp: payload.exp });
        } catch (e) {
          console.warn('Could not parse image token payload for validation');
        }

        console.log('Using RS256 token for R2 signing image request');
        const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Image fetch error:', response.status, errorText);
          throw new Error(`Failed to resolve image URL: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (data && data.url) {
          imageCache.set(imageKey, data.url);
          setResolvedSrc(data.url);
        } else {
          throw new Error("Resolved URL not found in image function response.");
        }
      } catch (err: any) {
        console.error("Error resolving image URL for key:", imageKey, err);
        setError(err.message);
        setResolvedSrc(placeholderSrc);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [imageKey, session, placeholderSrc]);

  if (isLoading && !resolvedSrc) {
    return (
      <div className={cn("animate-pulse bg-gray-700", className)} style={{ width: imgProps.width, height: imgProps.height }}>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc || placeholderSrc}
      alt={altText}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = placeholderSrc;
      }}
      {...imgProps}
    />
  );
};

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default ResolvedCoverImage;
