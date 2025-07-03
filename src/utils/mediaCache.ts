
// Enhanced global cache for resolved media URLs with expiration and device optimization
const globalMediaCache = new Map<string, { url: string; expires: number; deviceType?: string }>();
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes

// Preload queue for faster access
const preloadQueue = new Map<string, Promise<string | null>>();

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

// Network quality detection
const getNetworkQuality = (): 'slow' | 'fast' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType === '4g' || connection.effectiveType === '3g') {
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
 * Enhanced URL resolution with better caching and device optimization
 */
export async function resolveMediaUrl(
  fileKey: string, 
  session: any, 
  isAudioFile: boolean = false
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

  try {
    const r2Key = isAudioFile ? constructMusicR2Key(fileKey) : fileKey;
    
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
      throw new Error(`Failed to resolve URL: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.signedUrl) {
      globalMediaCache.set(cacheKey, {
        url: data.signedUrl,
        expires: Date.now() + CACHE_DURATION,
        deviceType
      });
      return data.signedUrl;
    }
    throw new Error("Resolved URL not found in function response.");
  } catch (error) {
    console.error("resolveMediaUrl error:", error);
    return null;
  }
}

/**
 * Enhanced lyrics fetching with caching and retry logic
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
        return await response.text() || 'No lyrics content found.';
      }
    } catch (error) {
      console.log('Cached lyrics URL expired, fetching new one');
    }
  }

  try {
    const resolvedLyricsUrl = await resolveMediaUrl(lyricsUrl, session, false);
    if (!resolvedLyricsUrl) {
      throw new Error("Could not resolve lyrics URL.");
    }

    // Cache the resolved URL
    globalMediaCache.set(cacheKey, {
      url: resolvedLyricsUrl,
      expires: Date.now() + CACHE_DURATION
    });

    const response = await fetch(resolvedLyricsUrl);
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
 * Preload multiple songs efficiently with device optimization
 */
export async function preloadSongs(
  songsToPreload: any[], 
  resolveUrl: (key: string, isAudio: boolean) => Promise<string | null>,
  setProgress: (progress: number) => void
) {
  const networkQuality = getNetworkQuality();
  const deviceType = getDeviceType();
  
  // Adjust preload count based on device and network
  let maxPreload = songsToPreload.length;
  if (deviceType === 'mobile') {
    maxPreload = Math.min(5, songsToPreload.length);
  } else if (networkQuality === 'slow') {
    maxPreload = Math.min(3, songsToPreload.length);
  }

  const songsToProcess = songsToPreload.slice(0, maxPreload);
  
  const preloadPromises = songsToProcess.map(async (song, index) => {
    const audioFileKey = song.storage_path || song.file_url;
    if (!audioFileKey || preloadQueue.has(song.id)) return;

    const preloadPromise = resolveUrl(audioFileKey, true);
    preloadQueue.set(song.id, preloadPromise);

    try {
      const resolvedUrl = await preloadPromise;
      if (resolvedUrl && deviceType !== 'mobile') {
        // Only preload audio metadata on non-mobile devices to save bandwidth
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = resolvedUrl;
      }
      
      setProgress(((index + 1) / songsToProcess.length) * 100);
    } catch (error) {
      console.error('Error preloading song:', song.title, error);
    }
  });

  await Promise.allSettled(preloadPromises);
  setProgress(100);
}

/**
 * Clear cache based on device memory constraints
 */
export function optimizeCache() {
  const deviceType = getDeviceType();
  const maxCacheSize = deviceType === 'mobile' ? 50 : 200;
  
  if (globalMediaCache.size > maxCacheSize) {
    const entries = Array.from(globalMediaCache.entries());
    entries.sort((a, b) => a[1].expires - b[1].expires);
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      globalMediaCache.delete(entries[i][0]);
    }
  }
}

// Auto-optimize cache every 5 minutes
setInterval(optimizeCache, 5 * 60 * 1000);

export { globalMediaCache, preloadQueue };
