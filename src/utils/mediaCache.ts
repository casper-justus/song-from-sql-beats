
// Enhanced global cache for resolved media URLs with expiration
const globalMediaCache = new Map<string, { url: string; expires: number }>();
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes

// Preload queue for faster access
const preloadQueue = new Map<string, Promise<string | null>>();

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
 * Enhanced URL resolution with better caching
 */
export async function resolveMediaUrl(
  fileKey: string, 
  session: any, 
  isAudioFile: boolean = false
): Promise<string | null> {
  if (!fileKey) return null;
  
  // Check cache first
  const cached = globalMediaCache.get(fileKey);
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
      globalMediaCache.set(fileKey, {
        url: data.signedUrl,
        expires: Date.now() + CACHE_DURATION
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
 * Preload multiple songs efficiently
 */
export async function preloadSongs(
  songsToPreload: any[], 
  resolveUrl: (key: string, isAudio: boolean) => Promise<string | null>,
  setProgress: (progress: number) => void
) {
  const preloadPromises = songsToPreload.map(async (song, index) => {
    const audioFileKey = song.storage_path || song.file_url;
    if (!audioFileKey || preloadQueue.has(song.id)) return;

    const preloadPromise = resolveUrl(audioFileKey, true);
    preloadQueue.set(song.id, preloadPromise);

    try {
      const resolvedUrl = await preloadPromise;
      if (resolvedUrl) {
        // Preload the audio metadata
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = resolvedUrl;
        
        setProgress(((index + 1) / songsToPreload.length) * 100);
      }
    } catch (error) {
      console.error('Error preloading song:', song.title, error);
    }
  });

  await Promise.allSettled(preloadPromises);
  setProgress(100);
}

export { globalMediaCache, preloadQueue };
