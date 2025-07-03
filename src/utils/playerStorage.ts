
/**
 * Save player state to localStorage
 */
export function savePlayerState(
  songId: string, 
  currentTime: number, 
  volume: number, 
  queue: any[], 
  queueIndex: number
) {
  try {
    localStorage.setItem('musicPlayer_state', JSON.stringify({
      lastSongId: songId,
      lastProgress: currentTime,
      lastVolume: volume,
      lastQueue: queue,
      lastQueueIndex: queueIndex,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save player state:', error);
  }
}

/**
 * Load player state from localStorage
 */
export function loadPlayerState(): { 
  lastSongId: string | null; 
  lastProgress: number; 
  lastVolume: number; 
  lastQueue: any[]; 
  lastQueueIndex: number; 
} | null {
  try {
    const saved = localStorage.getItem('musicPlayer_state');
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    // Only restore if saved within last 24 hours
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('musicPlayer_state');
      return null;
    }
    
    return {
      lastSongId: state.lastSongId,
      lastProgress: state.lastProgress || 0,
      lastVolume: state.lastVolume || 0.75,
      lastQueue: state.lastQueue || [],
      lastQueueIndex: state.lastQueueIndex || 0
    };
  } catch (error) {
    console.error('Failed to load player state:', error);
    return null;
  }
}
