// Enhanced global cache for resolved media URLs with mobile optimization
const globalMediaCache = new Map<string, { url: string; expires: number; deviceType?: string }>();
const CACHE_DURATION = 180 * 60 * 1000; // Increased to 3 hours for better caching

// Enhanced preload queue with mobile-optimized priority levels
const preloadQueue = new Map<string, Promise<string | null>>(); // Stores promises for resolved URLs
const audioBlobCache = new Map<string, Blob>(); // Stores fully preloaded audio Blobs
const priorityQueue = new Set<string>(); // Tracks song IDs that are high priority for preloading
const prefetchQueue = new Set<string>(); // Tracks song IDs currently being prefetched (URL or Blob)
const blobDownloadsInProgress = new Set<string>(); // Tracks song IDs of blobs currently being downloaded

// Simple in-memory cache for the Supabase token to reduce session.getToken() calls during rapid requests
let supabaseTokenCache: { token: string; expiresAt: number } | null = null;
const SUPABASE_TOKEN_CACHE_DURATION_MS = 60 * 1000; // Cache token for 60 seconds
// Removed import for @spicysparks/lrc-api

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
 * Enhanced URL resolution with flawless CORS handling - FIXED headers
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

  // Enhanced retry strategy with exponential backoff
  const maxRetries = memoryInfo.isLowMemory ? 3 : (priority === 'high' ? 5 : 4);
  const timeout = deviceType === 'mobile' ? 
    (networkQuality === 'slow' ? 20000 : 15000) : 
    (priority === 'high' ? 15000 : 10000);

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const r2Key = isAudioFile ? constructMusicR2Key(fileKey) : fileKey;
      let token: string | null = null;

      // Check our local token cache
      if (supabaseTokenCache && Date.now() < supabaseTokenCache.expiresAt) {
        token = supabaseTokenCache.token;
        // console.log('Using cached Supabase token');
      } else {
        // console.log('Fetching new Supabase token');
        const freshToken = await session.getToken({ template: 'supabase' });
        if (freshToken) {
          token = freshToken;
          supabaseTokenCache = { token, expiresAt: Date.now() + SUPABASE_TOKEN_CACHE_DURATION_MS };
        }
      }
      
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // FIXED CORS headers - removed unsupported caching headers
      const response = await fetch(`https://aws.njahjustus.workers.dev/sign-r2?key=${encodeURIComponent(r2Key)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': navigator.userAgent,
          'Origin': window.location.origin,
          'Referer': window.location.href,
          'Sec-Fetch-Dest': isAudioFile ? 'audio' : 'image',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
          // 'X-Requested-With': 'XMLHttpRequest' // Removed to match worker CORS policy
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Media file not found: ${r2Key}`);
          return null;
        }
        if (response.status === 403) {
          console.warn(`Access denied for: ${r2Key}, retrying with fresh token`);
          throw new Error(`Access denied: ${response.status}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data && data.signedUrl) {
        // Extended cache duration with optimization
        const cacheDuration = deviceType === 'mobile' ? 
          CACHE_DURATION * 1.5 : 
          (priority === 'high' ? CACHE_DURATION * 2 : CACHE_DURATION);
          
        globalMediaCache.set(cacheKey, {
          url: data.signedUrl,
          expires: Date.now() + cacheDuration,
          deviceType
        });
        
        console.log(`✅ Successfully resolved URL for: ${r2Key}`);
        return data.signedUrl;
      }
      throw new Error("Signed URL not found in response");
    } catch (error) {
      attempt++;
      const isLastAttempt = attempt >= maxRetries;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`⏰ Request timeout for ${fileKey} (attempt ${attempt})`);
      } else {
        console.warn(`❌ URL resolution attempt ${attempt} failed for ${fileKey}:`, error);
      }
      
      if (isLastAttempt) {
        console.error(`🚨 Failed to resolve URL after ${maxRetries} attempts:`, fileKey, error);
        return null;
      }
      
      // Progressive backoff with jitter and CORS retry logic
      const baseDelay = Math.min(Math.pow(2, attempt) * 1500, 10000);
      const jitter = Math.random() * 1000;
      const delay = deviceType === 'mobile' ? 
        (baseDelay * 0.8) + jitter : 
        baseDelay + jitter;
      
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

/**
 * Aggressive prefetching with intelligent prioritization and flawless loading
 */
export async function startBackgroundPrefetch(
  songs: any[], 
  resolveUrl: (key: string, isAudio: boolean, priority?: 'high' | 'normal') => Promise<string | null>,
  currentIndex: number = 0
) {
  const networkQuality = getNetworkQuality();
  const deviceType = getDeviceType();
  const memoryInfo = getMemoryInfo();
  
  // More aggressive prefetch limits for flawless experience
  let maxPrefetch = songs.length;
  
  if (deviceType === 'mobile') {
    if (memoryInfo.isLowMemory) {
      maxPrefetch = networkQuality === 'fast' ? 8 : 4;
    } else {
      maxPrefetch = networkQuality === 'fast' ? 15 : 10;
    }
  } else if (deviceType === 'tablet') {
    maxPrefetch = networkQuality === 'fast' ? 25 : 15;
  } else {
    maxPrefetch = networkQuality === 'fast' ? 50 : 30;
  }

  const prefetchList = [];
  
  // Prioritize immediate next 7 songs for seamless playback
  for (let i = 0; i < Math.min(7, songs.length); i++) {
    const index = (currentIndex + i) % songs.length;
    prefetchList.push({ song: songs[index], priority: 'high' as const, index });
  }
  
  // Add previous 5 songs for quick back navigation
  for (let i = 1; i <= 5 && prefetchList.length < maxPrefetch; i++) {
    const index = (currentIndex - i + songs.length) % songs.length;
    if (!prefetchList.find(item => item.index === index)) {
      prefetchList.push({ song: songs[index], priority: 'high' as const, index });
    }
  }
  
  // Fill remaining slots with normal priority
  let remainingSlots = maxPrefetch - prefetchList.length;
  for (let i = 7; i < songs.length && remainingSlots > 0; i++) {
    const index = (currentIndex + i) % songs.length;
    if (!prefetchList.find(item => item.index === index)) {
      prefetchList.push({ song: songs[index], priority: 'normal' as const, index });
      remainingSlots--;
    }
  }

  // Optimized batch sizes for flawless loading
  const batchSize = deviceType === 'mobile' ? 
    (memoryInfo.isLowMemory ? 3 : 5) : 
    (networkQuality === 'fast' ? 10 : 6);

  console.log(`🚀 Starting flawless prefetch: ${prefetchList.length} items in batches of ${batchSize}`);

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
        
        try { // Outer try for URL resolution and blob logic
          const resolvedAudioUrl = await audioPromise;
          if (resolvedAudioUrl) { // IF #A - for resolvedAudioUrl
            console.log(`✅ Resolved URL for audio: ${song.title}`);

            if (priority === 'high' && !audioBlobCache.has(song.id) && !blobDownloadsInProgress.has(song.id)) { // IF #B - for attempting blob download
              if (audioBlobCache.size + blobDownloadsInProgress.size < MAX_AUDIO_BLOB_CACHE_SIZE) { // IF #C - for limiting concurrent downloads
                console.log(`🚀 Attempting to fully preload high-priority audio: ${song.title} (Cache size: ${audioBlobCache.size}, Active Blob Downloads: ${blobDownloadsInProgress.size})`);
                blobDownloadsInProgress.add(song.id);
                try { // Inner try for blob fetching
                  const response = await fetch(resolvedAudioUrl);
                  if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                  const blob = await response.blob();
                  audioBlobCache.set(song.id, blob);
                  manageAudioBlobCache(song.id);
                  console.log(`✅ Fully preloaded audio blob for: ${song.title}. Blob cache size: ${audioBlobCache.size}`);
                } catch (blobError) {
                  console.warn(`❌ Failed to fully preload audio blob for ${song.title}:`, blobError);
                } finally {
                  blobDownloadsInProgress.delete(song.id);
                } // Closes Inner try-catch-finally
              } else { // ELSE for IF #C
                console.log(`[Cache] Holding off blob download for ${song.title}, cache/download limit reached (Size: ${audioBlobCache.size}, InProgress: ${blobDownloadsInProgress.size})`);
              } // Closes ELSE for IF #C
            } // Closes IF #B
          } // Closes IF #A
        } catch (error) { // Catch for Outer try
          console.warn(`❌ Failed to resolve/preload audio for ${song.title}:`, error);
        } // Closes Outer try-catch
      } // Closes: if (audioFileKey && !prefetchQueue.has(song.id))

      // Prefetch covers more aggressively
      if (coverKey && !prefetchQueue.has(`cover-${song.id}`)) {
        prefetchQueue.add(`cover-${song.id}`);
        resolveUrl(coverKey, false, 'normal').then(result => {
          if (result) {
            console.log(`✅ Prefetched cover: ${song.title}`);
          }
        }).catch(error => {
          console.warn(`❌ Failed to prefetch cover for ${song.title}:`, error);
        });
      }
    }); // End of batch.map callback

    await Promise.allSettled(batchPromises);
    
    // Minimal delay for lightning-fast prefetching
    if (i + batchSize < prefetchList.length) {
      const delay = deviceType === 'mobile' ? 
        (memoryInfo.isLowMemory ? 150 : 75) : 25;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('🎉 Flawless prefetching completed');
}

/**
 * Enhanced lyrics fetching. Now only uses direct LRC file fetching.
 */
// Removed: const lrcApi = new LrcApiModule.LrcApi();

export async function fetchLyricsContent(
  title: string, // title and artist are kept for potential future use or if fetchDirectLrcFile needs them
  artist: string,
  lyricsUrl?: string | null,
  session?: any
): Promise<string> {
  // Removed the section that tries to use lrcApi.getLyrics()

  // Fallback to direct lyricsUrl if available
  if (lyricsUrl && session) {
    // console.log(`[Lyrics] Attempting to fetch lyrics from direct URL: ${lyricsUrl}`);
    return fetchDirectLrcFile(lyricsUrl, session);
  }

  // If no lyricsUrl, or if title/artist were intended for an API that's now removed
  if (!lyricsUrl) {
      console.log('[Lyrics] No lyrics URL provided and API service removed.');
  }
  return 'Lyrics not available for this song.'; // Generic message if no URL or API failed
}

// Helper for the original direct LRC file fetching logic
async function fetchDirectLrcFile(lyricsUrl: string, session: any): Promise<string> {
  const cacheKey = `lyrics-direct-${lyricsUrl}`;
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(resolvedLyricsUrl, {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
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
  let maxCacheSize = 600; // Default for desktop
  
  if (deviceType === 'mobile') {
    maxCacheSize = memoryInfo.isLowMemory ? 40 : 100;  
  } else if (deviceType === 'tablet') {
    maxCacheSize = memoryInfo.isLowMemory ? 150 : 250;
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
    const removalRatio = deviceType === 'mobile' ? 0.5 : 0.3;
    const toRemove = Math.floor(entries.length * removalRatio);
    let removed = 0;
    
    for (const [key] of entries) {
      if (removed >= toRemove) break;
      if (!priorityQueue.has(key.split('-')[0])) {
        globalMediaCache.delete(key);
        removed++;
      }
    }
    
    console.log(`🧹 Cache optimized: removed ${removed} entries`);
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
const cacheOptimizationInterval = getDeviceType() === 'mobile' ? 45000 : 90000; // 45s-90s
setInterval(optimizeCache, cacheOptimizationInterval);

const MAX_AUDIO_BLOB_CACHE_SIZE = 10; // Increased from 5 to 10 for more aggressive caching

function manageAudioBlobCache(newlyAddedSongId?: string) {
  // If a newly added song ID is provided, ensure it's not evicted immediately if possible
  // This is a simple FIFO if newlyAddedSongId is not part of the oldest.
  // For true LRU, we'd need to track access times.

  while (audioBlobCache.size > MAX_AUDIO_BLOB_CACHE_SIZE) {
    // Get the first (oldest) key from the Map iterator
    const oldestKey = audioBlobCache.keys().next().value;
    if (oldestKey && oldestKey !== newlyAddedSongId) { // Avoid evicting the item just added if cache was already full
      const blobToRemove = audioBlobCache.get(oldestKey);
      if (blobToRemove) {
        // No explicit URL.revokeObjectURL here as the URL is created and revoked in the context
        // This cache just stores the blobs.
        console.log(`[Cache] Evicting audio blob for song ID: ${oldestKey} due to cache size limit.`);
        audioBlobCache.delete(oldestKey);
      }
    } else if (oldestKey && oldestKey === newlyAddedSongId && audioBlobCache.size > MAX_AUDIO_BLOB_CACHE_SIZE) {
      // If the oldest is the one just added, means we need to remove another one.
      // This simple FIFO might remove the "second oldest" in this specific edge case.
      // A more robust LRU would handle this better. For now, let's find another candidate.
      let evicted = false;
      for (const key of audioBlobCache.keys()) {
        if (key !== newlyAddedSongId) {
          audioBlobCache.delete(key);
          console.log(`[Cache] Evicting audio blob for song ID: ${key} (alternative) due to cache size limit.`);
          evicted = true;
          break;
        }
      }
      if (!evicted) { // Should not happen if size > 1
         audioBlobCache.delete(oldestKey); // Fallback if only the new item is there and > MAX (though MAX should be > 0)
      }
    } else {
      break; // Should not happen if logic is correct and size > MAX
    }
  }
}

export { globalMediaCache, preloadQueue, priorityQueue, audioBlobCache, manageAudioBlobCache };
