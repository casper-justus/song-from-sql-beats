
/**
 * Save player state to localStorage with improved structure
 */
export function savePlayerState(
  songId: string, 
  currentTime: number, 
  volume: number, 
  queue: any[], 
  queueIndex: number,
  isPlaying: boolean = false
) {
  try {
    localStorage.setItem('musicPlayer_state', JSON.stringify({
      lastSongId: songId,
      lastProgress: currentTime,
      lastVolume: volume,
      lastQueue: queue.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        storage_path: song.storage_path,
        file_url: song.file_url,
        cover_url: song.cover_url,
        video_id: song.video_id
      })), // Store only essential song data
      lastQueueIndex: queueIndex,
      wasPlaying: isPlaying,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save player state:', error);
  }
}

/**
 * Load player state from localStorage with validation
 */
export function loadPlayerState(): { 
  lastSongId: string | null; 
  lastProgress: number; 
  lastVolume: number; 
  lastQueue: any[]; 
  lastQueueIndex: number;
  wasPlaying: boolean;
} | null {
  try {
    const saved = localStorage.getItem('musicPlayer_state');
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    
    // Only restore if saved within last 4 hours to prevent stale state issues
    const fourHours = 4 * 60 * 60 * 1000;
    if (Date.now() - state.timestamp > fourHours) {
      localStorage.removeItem('musicPlayer_state');
      return null;
    }
    
    // Validate the state structure
    if (!state.lastSongId || !Array.isArray(state.lastQueue)) {
      return null;
    }
    
    return {
      lastSongId: state.lastSongId,
      lastProgress: Math.max(0, Math.min(state.lastProgress || 0, 300)), // Cap progress at 5 minutes
      lastVolume: Math.max(0, Math.min(state.lastVolume || 0.75, 1)),
      lastQueue: state.lastQueue || [],
      lastQueueIndex: Math.max(0, state.lastQueueIndex || 0),
      wasPlaying: false // Never auto-resume playing to prevent autoplay issues
    };
  } catch (error) {
    console.error('Failed to load player state:', error);
    // Clear corrupted state
    localStorage.removeItem('musicPlayer_state');
    return null;
  }
}

/**
 * Clear saved player state
 */
export function clearPlayerState() {
  try {
    localStorage.removeItem('musicPlayer_state');
  } catch (error) {
    console.error('Failed to clear player state:', error);
  }
}

/**
 * Save user preferences separately from player state
 */
export function saveUserPreferences(volume: number, repeatMode?: string, shuffleMode?: boolean) {
  try {
    localStorage.setItem('musicPlayer_preferences', JSON.stringify({
      volume: Math.max(0, Math.min(volume, 1)),
      repeatMode: repeatMode || 'none',
      shuffleMode: shuffleMode || false,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save user preferences:', error);
  }
}

/**
 * Load user preferences
 */
export function loadUserPreferences(): {
  volume: number;
  repeatMode: string;
  shuffleMode: boolean;
} {
  try {
    const saved = localStorage.getItem('musicPlayer_preferences');
    if (!saved) return { volume: 0.75, repeatMode: 'none', shuffleMode: false };
    
    const prefs = JSON.parse(saved);
    return {
      volume: Math.max(0, Math.min(prefs.volume || 0.75, 1)),
      repeatMode: prefs.repeatMode || 'none',
      shuffleMode: prefs.shuffleMode || false
    };
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return { volume: 0.75, repeatMode: 'none', shuffleMode: false };
  }
}
