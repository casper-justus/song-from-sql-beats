
import { useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export function useKeyboardShortcuts() {
  const { togglePlay, playNext, playPrevious, currentSong } = useMusicPlayer();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Prevent default behavior for our shortcuts
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (currentSong) togglePlay();
          break;
        case 'ArrowRight':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            playNext();
          }
          break;
        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            playPrevious();
          }
          break;
        case 'KeyN':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            playNext();
          }
          break;
        case 'KeyP':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            playPrevious();
          }
          break;
        // Standard Media Keys
        case 'MediaPlayPause':
          event.preventDefault();
          if (currentSong) togglePlay();
          break;
        case 'MediaTrackNext':
          event.preventDefault();
          playNext();
          break;
        case 'MediaTrackPrevious':
          event.preventDefault();
          playPrevious();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, playNext, playPrevious, currentSong]);
}
