
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
 * Clear all player related storage
 */
export function clearPlayerState() {
  try {
    localStorage.removeItem('musicPlayer_state');
    localStorage.removeItem('musicPlayer_preferences');
  } catch (error) {
    console.error('Failed to clear player state:', error);
  }
}
