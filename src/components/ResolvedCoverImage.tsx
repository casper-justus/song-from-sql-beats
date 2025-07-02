
import React, { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';

const SUPABASE_URL_FOR_FUNCTIONS = "https://dqckopgetuodqhgnhhxw.supabase.co";

interface ResolvedCoverImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageKey: string | null | undefined;
  altText: string;
  placeholderSrc?: string;
  className?: string;
}

const imageCache = new Map<string, string>();

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

        console.log('Using RS256 token for super-handler image request');
        const response = await fetch(`${SUPABASE_URL_FOR_FUNCTIONS}/functions/v1/super-handler?key=${encodeURIComponent(imageKey)}`, {
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
