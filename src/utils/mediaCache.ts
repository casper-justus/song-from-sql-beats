
// Enhanced global cache for resolved media URLs with aggressive prefetching
const globalMediaCache = new Map<string, { url: string; expires: number; deviceType?: string }>();
const CACHE_DURATION = 90 * 60 * 1000; // 1.5 hours (increased for better performance)

// Enhanced preload queue with priority management
const preloadQueue = new Map<string, Promise<string | null>>();
const priorityQueue = new Set<string>(); // High priority songs (current, next, previous)
const prefetchQueue = new Set<string>(); // Background prefetch queue

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
const getNetworkQuality = (): 'slow' | 'medium' | 'fast' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType === '4g' && connection.downlink > 4) {
      return 'fast';
    }
    if (connection.effectiveType === '4g' && connection.downlink > 2) {
      return 'medium';
    }
    if (connection.effectiveType === '3g' && connection.downlink > 1) {
      return 'medium';
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
 * Ultra-fast URL resolution with aggressive caching and instant fallbacks
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
  
  // Check cache first - return immediately if available
  const cached = globalMediaCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }
  
  if (!session) {
    console.error("No session available for URL resolution.");
    return null;
  }

  const networkQuality = getNetworkQuality();
  const maxRetries = priority === 'high' ? 3 : (networkQuality === 'fast' ? 2 : 1);
  const timeout = priority === 'high' ? 8000 : (networkQuality === 'fast' ? 5000 : 3000);
  
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
        
        // Add to prefetch queue for background loading
        if (priority === 'high') {
          priorityQueue.add(fileKey);
        }
        
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
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

/**
 * Fetch synced lyrics using track information
 */
export async function fetchSyncedLyrics(
  title: string,
  artist: string,
  album?: string
): Promise<string> {
  if (!title || !artist) {
    return 'No lyrics available - missing track information.';
  }

  try {
    // Clean up the search terms
    const cleanTitle = title.replace(/[^\w\s]/gi, '').trim();
    const cleanArtist = artist.replace(/[^\w\s]/gi, '').trim();
    const searchQuery = `${cleanArtist} ${cleanTitle}`;
    
    console.log('Searching for lyrics:', searchQuery);
    
    // Use Musixmatch API (you can replace with your preferred lyrics API)
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`);
    
    if (!response.ok) {
      throw new Error(`Lyrics API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.lyrics) {
      return data.lyrics;
    } else {
      return 'Lyrics not found for this track.';
    }
  } catch (error) {
    console.error('Error fetching synced lyrics:', error);
    return 'Error loading lyrics. Please try again later.';
  }
}

/**
 * Enhanced lyrics fetching with fallback to synced lyrics
 */
export async function fetchLyricsContent(
  lyricsUrl: string,
  session: any,
  title?: string,
  artist?: string,
  album?: string
): Promise<string> {
  // Try synced lyrics first if we have track info
  if (title && artist) {
    try {
      const syncedLyrics = await fetchSyncedLyrics(title, artist, album);
      if (syncedLyrics && !syncedLyrics.includes('Error') && !syncedLyrics.includes('not found')) {
        return syncedLyrics;
      }
    } catch (error) {
      console.log('Synced lyrics failed, trying stored lyrics');
    }
  }

  // Fallback to stored lyrics
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
 * Aggressive preloading with smart prioritization
 */
export async function preloadSongs(
  songsToPreload: any[], 
  resolveUrl: (key: string, isAudio: boolean, priority?: 'high' | 'normal') => Promise<string | null>,
  setProgress: (progress: number) => void,
  currentIndex: number = 0
) {
  const networkQuality = getNetworkQuality();
  const deviceType = getDeviceType();
  
  // Aggressive preloading based on device and network
  let maxPreload = songsToPreload.length;
  if (deviceType === 'mobile') {
    maxPreload = networkQuality === 'fast' ? 15 : 8;
  } else {
    maxPreload = networkQuality === 'fast' ? 25 : (networkQuality === 'medium' ? 20 : 12);
  }

  maxPreload = Math.min(maxPreload, songsToPreload.length);

  // Smart prioritization: current + next 3 + previous 2
  const prioritizedSongs = [];
  const regularSongs = [];

  songsToPreload.forEach((song, index) => {
    const distance = Math.abs(index - currentIndex);
    const isNext = index > currentIndex && distance <= 3;
    const isPrev = index < currentIndex && distance <= 2;
    const isCurrent = index === currentIndex;
    
    if (isCurrent || isNext || isPrev) {
      prioritizedSongs.push({ song, index, priority: 'high' as const });
    } else if (index < maxPreload) {
      regularSongs.push({ song, index, priority: 'normal' as const });
    }
  });

  const allSongs = [...prioritizedSongs, ...regularSongs];
  
  // Batch processing for better performance
  const batchSize = networkQuality === 'fast' ? 5 : 3;
  let completed = 0;
  
  for (let i = 0; i < allSongs.length; i += batchSize) {
    const batch = allSongs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ({ song, index, priority }) => {
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
          // Preload audio metadata on non-mobile devices
          const audio = new Audio();
          audio.preload = 'metadata';
          audio.src = resolvedUrl;
        }
        
        completed++;
        setProgress((completed / allSongs.length) * 100);
      } catch (error) {
        console.error('Error preloading song:', song.title, error);
        completed++;
        setProgress((completed / allSongs.length) * 100);
      }
    });

    await Promise.allSettled(batchPromises);
    
    // Small delay between batches to prevent overwhelming the network
    if (i + batchSize < allSongs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  setProgress(100);
}

/**
 * Background prefetching for upcoming songs
 */
export function startBackgroundPrefetch(
  songs: any[],
  currentIndex: number,
  resolveUrl: (key: string, isAudio: boolean, priority?: 'high' | 'normal') => Promise<string | null>
) {
  // Prefetch next 5 songs in background
  const nextSongs = songs.slice(currentIndex + 1, currentIndex + 6);
  
  nextSongs.forEach(async (song, index) => {
    if (prefetchQueue.has(song.id)) return;
    
    prefetchQueue.add(song.id);
    
    try {
      const audioFileKey = song.storage_path || song.file_url;
      if (audioFileKey) {
        await resolveUrl(audioFileKey, true, 'normal');
      }
    } catch (error) {
      console.log('Background prefetch failed for:', song.title);
    }
  });
}

/**
 * Enhanced cache optimization with aggressive cleanup
 */
export function optimizeCache() {
  const deviceType = getDeviceType();
  const maxCacheSize = deviceType === 'mobile' ? 100 : 400; // Increased cache size
  
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
