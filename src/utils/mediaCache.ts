// Enhanced global cache for resolved media URLs with mobile optimization
const globalMediaCache = new Map<string, { url: string; expires: number; deviceType?: string }>();
const CACHE_DURATION = 120 * 60 * 1000; // Increased to 2 hours for better Cloudflare caching

// Enhanced preload queue with mobile-optimized priority levels
const preloadQueue = new Map<string, Promise<string | null>>();
const priorityQueue = new Set<string>();
const prefetchQueue = new Set<string>();

// Enhanced device detection for mobile optimization
const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|phone/i.test(userAgent);
  const isTablet = /tablet|ipad/i.test(userAgent);
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

// Enhanced network quality detection with mobile considerations
const getNetworkQuality = (): 'slow' | 'medium' | 'fast' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink || 0;
    
    if (effectiveType === '4g' && downlink > 5) return 'fast';
    if (effectiveType === '4g' && downlink > 2) return 'medium';
    if (effectiveType === '3g' && downlink > 1) return 'medium';
  }
  return 'slow';
};

// Mobile-optimized memory detection
const getMemoryInfo = () => {
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    const usedJSHeapSize = memory.usedJSHeapSize / 1024 / 1024; // MB
    const totalJSHeapSize = memory.totalJSHeapSize / 1024 / 1024; // MB
    
    return {
      used: usedJSHeapSize,
      total: totalJSHeapSize,
      isLowMemory: usedJSHeapSize > totalJSHeapSize * 0.8 || totalJSHeapSize < 100
    };
  }
  return { used: 0, total: 0, isLowMemory: false };
};

/**
 * Constructs the proper R2 key for music files with Cloudflare cache optimization
 */
export function constructMusicR2Key(storagePath: string): string {
  if (storagePath.startsWith('music/')) {
    return storagePath;
  }
  return `music/${storagePath}`;
}

/**
 * Enhanced URL resolution with Cloudflare caching and mobile optimization
 */
export async function resolveMediaUrl(
  fileKey: string, 
  session: any, 
  isAudioFile: boolean = false,
  priority: 'high' | 'normal' = 'normal'
): Promise<string | null> {
  if (!fileKey) return null;
  
  const deviceType = getDeviceType();
  const networkQuality = getNetworkQuality();
  const memoryInfo = getMemoryInfo();
  const cacheKey = `${fileKey}-${deviceType}`;
  
  // Check cache first with extended duration for mobile
  const cached = globalMediaCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }
  
  if (!session) {
    console.error("No session available for URL resolution.");
    return null;
  }

  // Adaptive retry strategy based on device capabilities
  const maxRetries = memoryInfo.isLowMemory ? 2 : (priority === 'high' ? 4 : 3);
  const timeout = deviceType === 'mobile' ? 
    (networkQuality === 'slow' ? 12000 : 8000) : 
    (priority === 'high' ? 10000 : 6000);

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
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Enhanced headers for Cloudflare caching
      const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=7200', // 2 hours cache
          'CF-Cache-Tag': `media-${deviceType}`, // Cloudflare cache tagging
          'Accept-Encoding': 'gzip, deflate, br' // Enable compression
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to resolve URL: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.signedUrl) {
        // Extended cache duration for mobile to reduce requests
        const cacheDuration = deviceType === 'mobile' ? 
          CACHE_DURATION * 1.5 : 
          (priority === 'high' ? CACHE_DURATION * 2 : CACHE_DURATION);
          
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
      // Adaptive backoff with mobile considerations
      const backoffTime = deviceType === 'mobile' ? 
        Math.min(Math.pow(2, attempt) * 500, 3000) + Math.random() * 500 :
        Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  return null;
}

/**
 * Mobile-optimized background prefetching with memory awareness
 */
export async function startBackgroundPrefetch(
  songs: any[], 
  resolveUrl: (key: string, isAudio: boolean, priority?: 'high' | 'normal') => Promise<string | null>,
  currentIndex: number = 0
) {
  const networkQuality = getNetworkQuality();
  const deviceType = getDeviceType();
  const memoryInfo = getMemoryInfo();
  
  // Adaptive prefetch limits based on device capabilities
  let maxPrefetch = songs.length;
  
  if (deviceType === 'mobile') {
    if (memoryInfo.isLowMemory) {
      maxPrefetch = networkQuality === 'fast' ? 4 : 2;
    } else {
      maxPrefetch = networkQuality === 'fast' ? 8 : 4;
    }
  } else if (deviceType === 'tablet') {
    maxPrefetch = networkQuality === 'fast' ? 15 : 8;
  } else {
    maxPrefetch = networkQuality === 'fast' ? 30 : 20;
  }

  const prefetchList = [];
  
  // Prioritize immediate next songs for seamless playback
  for (let i = 0; i < Math.min(3, songs.length); i++) {
    const index = (currentIndex + i) % songs.length;
    prefetchList.push({ song: songs[index], priority: 'high' as const, index });
  }
  
  // Add previous songs for quick back navigation
  for (let i = 1; i <= 2 && prefetchList.length < maxPrefetch; i++) {
    const index = (currentIndex - i + songs.length) % songs.length;
    if (!prefetchList.find(item => item.index === index)) {
      prefetchList.push({ song: songs[index], priority: 'high' as const, index });
    }
  }
  
  // Fill remaining slots with normal priority
  let remainingSlots = maxPrefetch - prefetchList.length;
  for (let i = 3; i < songs.length && remainingSlots > 0; i++) {
    const index = (currentIndex + i) % songs.length;
    if (!prefetchList.find(item => item.index === index)) {
      prefetchList.push({ song: songs[index], priority: 'normal' as const, index });
      remainingSlots--;
    }
  }

  // Mobile-optimized batch processing
  const batchSize = deviceType === 'mobile' ? 
    (memoryInfo.isLowMemory ? 1 : 2) : 
    (networkQuality === 'fast' ? 4 : 2);

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
      
      // Only prefetch covers if not low memory
      if (coverKey && !memoryInfo.isLowMemory && !prefetchQueue.has(`cover-${song.id}`)) {
        prefetchQueue.add(`cover-${song.id}`);
        resolveUrl(coverKey, false, 'normal').catch(() => {
          // Ignore cover prefetch errors
        });
      }
    });

    await Promise.allSettled(batchPromises);
    
    // Adaptive delay between batches
    if (i + batchSize < prefetchList.length) {
      const delay = deviceType === 'mobile' ? 
        (memoryInfo.isLowMemory ? 300 : 150) : 100;
      await new Promise(resolve => setTimeout(resolve, delay));
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
 * Mobile-optimized cache management with memory monitoring
 */
export function optimizeCache() {
  const deviceType = getDeviceType();
  const memoryInfo = getMemoryInfo();
  
  // Adaptive cache limits based on device capabilities
  let maxCacheSize = 500; // Default for desktop
  
  if (deviceType === 'mobile') {
    maxCacheSize = memoryInfo.isLowMemory ? 30 : 80;  
  } else if (deviceType === 'tablet') {
    maxCacheSize = memoryInfo.isLowMemory ? 100 : 200;
  }
  
  if (globalMediaCache.size > maxCacheSize) {
    const entries = Array.from(globalMediaCache.entries());
    
    // Enhanced sorting with device-specific priorities
    entries.sort((a, b) => {
      const aIsPriority = priorityQueue.has(a[0].split('-')[0]);
      const bIsPriority = priorityQueue.has(b[0].split('-')[0]);
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      return a[1].expires - b[1].expires;
    });
    
    // More aggressive cleanup for mobile devices
    const removalRatio = deviceType === 'mobile' ? 0.4 : 0.25;
    const toRemove = Math.floor(entries.length * removalRatio);
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

// More frequent cache optimization for mobile devices
const cacheOptimizationInterval = getDeviceType() === 'mobile' ? 60000 : 120000; // 1-2 minutes
setInterval(optimizeCache, cacheOptimizationInterval);

export { globalMediaCache, preloadQueue, priorityQueue };
