// Enhanced global cache for resolved media URLs with expiration and device optimization
const globalMediaCache = new Map<string, { url: string; expires: number; deviceType?: string }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (increased from 45 minutes)

// Preload queue for faster access with priority management
const preloadQueue = new Map<string, Promise<string | null>>();
const priorityQueue = new Set<string>(); // High priority songs (current, next, previous)

// Device detection for optimized caching
const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    return 'mobile';
  }
  if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
};

// Network quality detection with more accurate assessment
const getNetworkQuality = (): 'slow' | 'fast' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType === '4g' && connection.downlink > 2) {
      return 'fast';
    }
    if (connection.effectiveType === '3g' && connection.downlink > 1) {
      return 'fast';
    }
  }
  return 'slow';
};

/**
 * Constructs the proper R2 key for music files by adding the 'music/' prefix
 */
export function constructMusicR2Key(storagePath: string): string {
  if (storagePath.startsWith('music/')) {
    return storagePath;
  }
  return `music/${storagePath}`;
}

/**
 * Enhanced URL resolution with better caching, retry logic, and priority handling
 */
export async function resolveMediaUrl(
  fileKey: string, 
  session: any, 
  isAudioFile: boolean = false,
  priority: 'high' | 'normal' = 'normal'
): Promise<string | null> {
  if (!fileKey) return null;
  
  const deviceType = getDeviceType();
  const cacheKey = `${fileKey}-${deviceType}`;
  
  // Check cache first
  const cached = globalMediaCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }
  
  if (!session) {
    console.error("No session available for URL resolution.");
    return null;
  }

  const maxRetries = priority === 'high' ? 3 : 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const r2Key = isAudioFile ? constructMusicR2Key(fileKey) : fileKey;
      
      const token = await session.getToken({
        template: 'supabase'
      });
      
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), priority === 'high' ? 5000 : 3000);

      const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to resolve URL: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.signedUrl) {
        // Use longer cache duration for high priority items
        const cacheDuration = priority === 'high' ? CACHE_DURATION * 2 : CACHE_DURATION;
        globalMediaCache.set(cacheKey, {
          url: data.signedUrl,
          expires: Date.now() + cacheDuration,
          deviceType
        });
        return data.signedUrl;
      }
      throw new Error("Resolved URL not found in function response.");
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error(`resolveMediaUrl error after ${maxRetries} attempts:`, error);
        return null;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  return null;
}

/**
 * Enhanced lyrics fetching with better caching and error handling
 */
export async function fetchLyricsContent(
  lyricsUrl: string,
  session: any
): Promise<string> {
  if (!lyricsUrl) {
    return 'No lyrics available for this song.';
  }

  const cacheKey = `lyrics-${lyricsUrl}`;
  const cached = globalMediaCache.get(cacheKey);
  
  if (cached && Date.now() < cached.expires) {
    try {
      const response = await fetch(cached.url);
      if (response.ok) {
        const text = await response.text();
        return text || 'No lyrics content found.';
      }
    } catch (error) {
      console.log('Cached lyrics URL expired, fetching new one');
    }
  }

  try {
    const resolvedLyricsUrl = await resolveMediaUrl(lyricsUrl, session, false, 'normal');
    if (!resolvedLyricsUrl) {
      throw new Error("Could not resolve lyrics URL.");
    }

    // Cache the resolved URL with shorter duration for lyrics
    globalMediaCache.set(cacheKey, {
      url: resolvedLyricsUrl,
      expires: Date.now() + (CACHE_DURATION / 2)
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(resolvedLyricsUrl, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch lyrics content: ${response.statusText}`);
    }

    const text = await response.text();
    return text || 'No lyrics content found.';
  } catch (error) {
    console.error('Error fetching lyrics content:', error);
    return 'Error loading lyrics. Please try again later.';
  }
}

/**
 * Optimized preloading with priority management
 */
export async function preloadSongs(
  songsToPreload: any[], 
  resolveUrl: (key: string, isAudio: boolean, priority?: 'high' | 'normal') => Promise<string | null>,
  setProgress: (progress: number) => void,
  currentIndex: number = 0
) {
  const networkQuality = getNetworkQuality();
  const deviceType = getDeviceType();
  
  // Adjust preload count based on device and network
  let maxPreload = songsToPreload.length;
  if (deviceType === 'mobile') {
    maxPreload = Math.min(8, songsToPreload.length);
  } else if (networkQuality === 'slow') {
    maxPreload = Math.min(5, songsToPreload.length);
  } else {
    maxPreload = Math.min(15, songsToPreload.length);
  }

  // Prioritize current, next, and previous songs
  const prioritizedSongs = [];
  const regularSongs = [];

  songsToPreload.forEach((song, index) => {
    const isPriority = Math.abs(index - currentIndex) <= 2; // Current + 2 next/prev
    if (isPriority) {
      prioritizedSongs.push({ song, index, priority: 'high' as const });
    } else if (index < maxPreload) {
      regularSongs.push({ song, index, priority: 'normal' as const });
    }
  });

  const allSongs = [...prioritizedSongs, ...regularSongs];
  
  const preloadPromises = allSongs.map(async ({ song, index, priority }) => {
    const audioFileKey = song.storage_path || song.file_url;
    if (!audioFileKey || preloadQueue.has(song.id)) return;

    const preloadPromise = resolveUrl(audioFileKey, true, priority);
    preloadQueue.set(song.id, preloadPromise);

    if (priority === 'high') {
      priorityQueue.add(song.id);
    }

    try {
      const resolvedUrl = await preloadPromise;
      if (resolvedUrl && deviceType !== 'mobile') {
        // Only preload audio metadata on non-mobile devices to save bandwidth
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = resolvedUrl;
      }
      
      setProgress(((index + 1) / allSongs.length) * 100);
    } catch (error) {
      console.error('Error preloading song:', song.title, error);
    }
  });

  await Promise.allSettled(preloadPromises);
  setProgress(100);
}

/**
 * Enhanced cache optimization with better memory management
 */
export function optimizeCache() {
  const deviceType = getDeviceType();
  const maxCacheSize = deviceType === 'mobile' ? 75 : 300;
  
  if (globalMediaCache.size > maxCacheSize) {
    const entries = Array.from(globalMediaCache.entries());
    
    // Sort by priority (keep high priority items) and expiration
    entries.sort((a, b) => {
      const aIsPriority = priorityQueue.has(a[0].split('-')[0]);
      const bIsPriority = priorityQueue.has(b[0].split('-')[0]);
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      return a[1].expires - b[1].expires;
    });
    
    // Remove oldest 30% of non-priority entries
    const toRemove = Math.floor(entries.length * 0.3);
    let removed = 0;
    
    for (const [key] of entries) {
      if (removed >= toRemove) break;
      if (!priorityQueue.has(key.split('-')[0])) {
        globalMediaCache.delete(key);
        removed++;
      }
    }
  }
  
  // Clean up expired priority items
  const now = Date.now();
  for (const key of priorityQueue) {
    const cacheEntry = globalMediaCache.get(`${key}-${getDeviceType()}`);
    if (cacheEntry && now > cacheEntry.expires) {
      priorityQueue.delete(key);
    }
  }
}

// Optimize cache more frequently for better performance
setInterval(optimizeCache, 3 * 60 * 1000); // Every 3 minutes

export { globalMediaCache, preloadQueue, priorityQueue };
