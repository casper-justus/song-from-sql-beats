
// Enhanced global cache for resolved media URLs with faster prefetching
const globalMediaCache = new Map<string, { url: string; expires: number; deviceType?: string }>();
const CACHE_DURATION = 90 * 60 * 1000; // Increased to 90 minutes

// Enhanced preload queue with priority levels
const preloadQueue = new Map<string, Promise<string | null>>();
const priorityQueue = new Set<string>();
const prefetchQueue = new Set<string>();

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

// Enhanced network quality detection
const getNetworkQuality = (): 'slow' | 'fast' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType === '4g' && connection.downlink > 3) {
      return 'fast';
    }
    if (connection.effectiveType === '3g' && connection.downlink > 1.5) {
      return 'fast';
    }
  }
  return 'slow';
};

/**
 * Constructs the proper R2 key for music files
 */
export function constructMusicR2Key(storagePath: string): string {
  if (storagePath.startsWith('music/')) {
    return storagePath;
  }
  return `music/${storagePath}`;
}

/**
 * Enhanced URL resolution with aggressive prefetching and caching
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

  const maxRetries = priority === 'high' ? 4 : 2;
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
      const timeoutId = setTimeout(() => controller.abort(), priority === 'high' ? 8000 : 5000);

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
      // Exponential backoff with jitter
      const backoffTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  return null;
}

/**
 * Aggressive background prefetching for better performance
 */
export async function startBackgroundPrefetch(
  songs: any[], 
  resolveUrl: (key: string, isAudio: boolean, priority?: 'high' | 'normal') => Promise<string | null>,
  currentIndex: number = 0
) {
  const networkQuality = getNetworkQuality();
  const deviceType = getDeviceType();
  
  // Determine how many songs to prefetch based on device and network
  let maxPrefetch = songs.length;
  if (deviceType === 'mobile') {
    maxPrefetch = networkQuality === 'fast' ? 12 : 6;
  } else {
    maxPrefetch = networkQuality === 'fast' ? 25 : 15;
  }

  // Prioritize songs around current position
  const prefetchList = [];
  
  // Add current and next 3 songs as high priority
  for (let i = 0; i < Math.min(4, songs.length); i++) {
    const index = (currentIndex + i) % songs.length;
    prefetchList.push({ song: songs[index], priority: 'high' as const, index });
  }
  
  // Add previous 2 songs as high priority
  for (let i = 1; i <= 2 && prefetchList.length < maxPrefetch; i++) {
    const index = (currentIndex - i + songs.length) % songs.length;
    if (!prefetchList.find(item => item.index === index)) {
      prefetchList.push({ song: songs[index], priority: 'high' as const, index });
    }
  }
  
  // Fill remaining slots with normal priority
  let remainingSlots = maxPrefetch - prefetchList.length;
  for (let i = 4; i < songs.length && remainingSlots > 0; i++) {
    const index = (currentIndex + i) % songs.length;
    if (!prefetchList.find(item => item.index === index)) {
      prefetchList.push({ song: songs[index], priority: 'normal' as const, index });
      remainingSlots--;
    }
  }

  // Start prefetching in batches to avoid overwhelming the network
  const batchSize = networkQuality === 'fast' ? 5 : 3;
  for (let i = 0; i < prefetchList.length; i += batchSize) {
    const batch = prefetchList.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ({ song, priority }) => {
      const audioFileKey = song.storage_path || song.file_url;
      const coverKey = song.cover_url;
      
      if (audioFileKey && !prefetchQueue.has(song.id)) {
        prefetchQueue.add(song.id);
        const audioPromise = resolveUrl(audioFileKey, true, priority);
        preloadQueue.set(song.id, audioPromise);
        
        if (priority === 'high') {
          priorityQueue.add(song.id);
        }
      }
      
      // Also prefetch cover images
      if (coverKey && !prefetchQueue.has(`cover-${song.id}`)) {
        prefetchQueue.add(`cover-${song.id}`);
        resolveUrl(coverKey, false, 'normal').catch(() => {
          // Ignore cover prefetch errors
        });
      }
    });

    await Promise.allSettled(batchPromises);
    
    // Small delay between batches to prevent overwhelming
    if (i + batchSize < prefetchList.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Enhanced lyrics fetching with better caching
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

    globalMediaCache.set(cacheKey, {
      url: resolvedLyricsUrl,
      expires: Date.now() + (CACHE_DURATION / 2)
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
 * Optimized cache management with better memory efficiency
 */
export function optimizeCache() {
  const deviceType = getDeviceType();
  const maxCacheSize = deviceType === 'mobile' ? 100 : 400;
  
  if (globalMediaCache.size > maxCacheSize) {
    const entries = Array.from(globalMediaCache.entries());
    
    // Sort by priority and expiration
    entries.sort((a, b) => {
      const aIsPriority = priorityQueue.has(a[0].split('-')[0]);
      const bIsPriority = priorityQueue.has(b[0].split('-')[0]);
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      return a[1].expires - b[1].expires;
    });
    
    // Remove oldest 25% of non-priority entries
    const toRemove = Math.floor(entries.length * 0.25);
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

// More frequent cache optimization for better performance
setInterval(optimizeCache, 2 * 60 * 1000); // Every 2 minutes

export { globalMediaCache, preloadQueue, priorityQueue };
