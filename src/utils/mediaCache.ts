// Enhanced media cache with better CORS handling and synced lyrics
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const urlCache = new Map<string, { url: string; timestamp: number }>();
export const preloadQueue = new Map<string, Promise<string | null>>();

interface CacheEntry {
  url: string;
  timestamp: number;
  priority: 'high' | 'normal';
}

const priorityCache = new Map<string, CacheEntry>();

// Enhanced URL resolution with better CORS handling
export const resolveMediaUrl = async (
  fileKey: string, 
  session: any, 
  isAudioFile: boolean = false,
  priority: 'high' | 'normal' = 'normal'
): Promise<string | null> => {
  if (!fileKey || !session) return null;

  const cacheKey = `${fileKey}_${isAudioFile ? 'audio' : 'image'}_${priority}`;
  const cached = priorityCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  try {
    // Use a proxy or CORS-friendly approach
    const baseUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent(fileKey);
    const proxiedUrl = `${baseUrl}${targetUrl}`;
    
    // For high priority requests, verify the URL works
    if (priority === 'high') {
      const response = await fetch(proxiedUrl, { 
        method: 'HEAD',
        mode: 'cors',
        headers: {
          'Accept': isAudioFile ? 'audio/*' : 'image/*'
        }
      });
      
      if (!response.ok) {
        console.warn(`Failed to verify ${cacheKey}:`, response.status);
        return fileKey; // Fallback to original URL
      }
    }

    const resolvedUrl = proxiedUrl;
    priorityCache.set(cacheKey, {
      url: resolvedUrl,
      timestamp: Date.now(),
      priority
    });

    return resolvedUrl;
  } catch (error) {
    console.warn(`Error resolving ${cacheKey}:`, error);
    // Return original URL as fallback
    return fileKey;
  }
};

// Enhanced preloading with better error handling
export const preloadSongs = async (
  songs: any[],
  resolveUrl: (key: string, isAudio: boolean, priority: 'high' | 'normal') => Promise<string | null>,
  onProgress?: (progress: number) => void,
  startIndex: number = 0
): Promise<void> => {
  const totalSongs = Math.min(songs.length, 8); // Limit to prevent overwhelming
  let completed = 0;

  const preloadPromises = songs.slice(0, totalSongs).map(async (song, index) => {
    try {
      const priority = index < 3 ? 'high' : 'normal';
      const audioKey = song.storage_path || song.file_url;
      
      if (audioKey && !preloadQueue.has(song.id)) {
        const preloadPromise = resolveUrl(audioKey, true, priority);
        preloadQueue.set(song.id, preloadPromise);
        await preloadPromise;
      }

      // Preload cover image
      if (song.cover_url) {
        await resolveUrl(song.cover_url, false, 'normal');
      }

      completed++;
      if (onProgress) {
        onProgress((completed / totalSongs) * 100);
      }
    } catch (error) {
      console.warn(`Failed to preload song ${song.title}:`, error);
      completed++;
      if (onProgress) {
        onProgress((completed / totalSongs) * 100);
      }
    }
  });

  await Promise.allSettled(preloadPromises);
};

// Background prefetch for upcoming songs
export const startBackgroundPrefetch = async (
  songs: any[],
  currentIndex: number,
  resolveUrl: (key: string, isAudio: boolean, priority: 'high' | 'normal') => Promise<string | null>
): Promise<void> => {
  const nextSongs = songs.slice(currentIndex + 1, currentIndex + 6);
  
  // Use setTimeout to avoid blocking the main thread
  setTimeout(() => {
    preloadSongs(nextSongs, resolveUrl, undefined, 0);
  }, 1000);
};

// Enhanced lyrics fetching with synced lyrics support
export const fetchLyricsContent = async (
  lyricsUrl: string,
  session: any,
  title?: string,
  artist?: string,
  album?: string
): Promise<string> => {
  // First try the provided lyrics URL
  if (lyricsUrl) {
    try {
      const resolvedUrl = await resolveMediaUrl(lyricsUrl, session, false, 'normal');
      if (resolvedUrl) {
        const response = await fetch(resolvedUrl);
        if (response.ok) {
          return await response.text();
        }
      }
    } catch (error) {
      console.warn('Error fetching lyrics from URL:', error);
    }
  }

  // Try to fetch synced lyrics using search
  if (title && artist) {
    try {
      console.log(`Searching for lyrics: ${artist} ${title} ${album || ''}`);
      
      // Use a CORS-friendly lyrics API or service
      const searchQuery = encodeURIComponent(`${artist} ${title}`);
      const lyricsApiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      
      const response = await fetch(lyricsApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          return data.lyrics;
        }
      }
    } catch (error) {
      console.error('Error fetching synced lyrics:', error);
    }
  }

  return 'No lyrics available for this song.';
};

// Clear old cache entries
export const clearOldCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of priorityCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      priorityCache.delete(key);
    }
  }
  
  for (const [key, promise] of preloadQueue.entries()) {
    // Keep only recent preload promises
    setTimeout(() => {
      if (preloadQueue.get(key) === promise) {
        preloadQueue.delete(key);
      }
    }, CACHE_DURATION);
  }
};

// Auto-cleanup
setInterval(clearOldCache, 10 * 60 * 1000); // Every 10 minutes
