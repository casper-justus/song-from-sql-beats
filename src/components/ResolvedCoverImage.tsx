import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // To get JWT
// Assuming SUPABASE_URL_FOR_FUNCTIONS is accessible, e.g. from a config file or defined globally
// For now, I'll copy it here. Ideally, import it.
const SUPABASE_URL_FOR_FUNCTIONS = "https://dqckopgetuodqhgnhhxw.supabase.co";

interface ResolvedCoverImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageKey: string | null | undefined;
  altText: string;
  placeholderSrc?: string;
  className?: string;
}

// A simple in-memory cache for resolved image URLs for the session
const imageCache = new Map<string, string>();

const ResolvedCoverImage: React.FC<ResolvedCoverImageProps> = ({
  imageKey,
  altText,
  placeholderSrc = '/placeholder.svg', // Default placeholder
  className,
  ...imgProps
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth(); // Get session for JWT

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
      if (!session?.access_token) {
        setError("Authentication token not available.");
        setResolvedSrc(placeholderSrc);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${SUPABASE_URL_FOR_FUNCTIONS}/functions/v1/super-handler?key=${encodeURIComponent(imageKey)}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Failed to resolve image URL: ${errorData.message || response.statusText}`);
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
    // You can return a spinner or a more elaborate placeholder
    return (
      <div className={cn("animate-pulse bg-gray-700", className)} style={{ width: imgProps.width, height: imgProps.height }}>
        {/* Placeholder structure matching image dimensions if provided */}
      </div>
    );
  }

  // If there was an error or no key, resolvedSrc will be placeholderSrc
  // If successfully resolved, resolvedSrc will be the actual URL
  return (
    <img
      src={resolvedSrc || placeholderSrc}
      alt={altText}
      className={className}
      onError={(e) => {
        // Handles cases where the resolved URL itself is broken or if placeholder is also broken
        (e.target as HTMLImageElement).src = placeholderSrc;
      }}
      {...imgProps}
    />
  );
};

// Helper for cn if not already globally available or in utils
// This is a simplified version. In a real app, use the one from "@/lib/utils"
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');


export default ResolvedCoverImage;
