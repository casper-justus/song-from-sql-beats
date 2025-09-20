
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

/**
 * Save current playback state including last played song and progress
 */
export function savePlaybackState(songId: string, currentTime: number, duration: number) {
  try {
    localStorage.setItem('musicPlayer_playback', JSON.stringify({
      songId,
      currentTime: Math.max(0, currentTime),
      duration: Math.max(0, duration),
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save playback state:', error);
  }
}

/**
 * Load last playback state
 */
export function loadPlaybackState(): {
  songId: string | null;
  currentTime: number;
  duration: number;
} | null {
  try {
    const saved = localStorage.getItem('musicPlayer_playback');
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    // Only restore if saved within last 24 hours
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('musicPlayer_playback');
      return null;
    }
    
    return {
      songId: state.songId || null,
      currentTime: Math.max(0, state.currentTime || 0),
      duration: Math.max(0, state.duration || 0)
    };
  } catch (error) {
    console.error('Failed to load playback state:', error);
    return null;
  }
}

/**
 * Clear all player related storage
 */
export function clearPlayerState() {
  try {
    localStorage.removeItem('musicPlayer_state');
    localStorage.removeItem('musicPlayer_preferences');
    localStorage.removeItem('musicPlayer_playback');
  } catch (error) {
    console.error('Failed to clear player state:', error);
  }
}
