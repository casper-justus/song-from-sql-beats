import { useState, useEffect } from 'react';
import { AudioPlayer } from 'capacitor-native-audio';

const AUDIO_ID = 'myUniqueAudioId';

export const useNativeAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const setupListeners = async () => {
      const onPlay = await AudioPlayer.addListener('onPlay', () => setIsPlaying(true));
      const onPause = await AudioPlayer.addListener('onPause', () => setIsPlaying(false));
      const onEnded = await AudioPlayer.addListener('onEnded', () => setIsPlaying(false));
      const onError = await AudioPlayer.addListener('onError', (error) => console.error('Audio playback error:', error));

      return () => {
        onPlay.remove();
        onPause.remove();
        onEnded.remove();
        onError.remove();
      };
    };

    const removeListeners = setupListeners();

    return () => {
      removeListeners.then(fn => fn());
    };
  }, []);

  const play = async (song: { id: string, localPath?: string, streamUrl: string, title: string, artist: string, album: string, artworkUrl: string }) => {
    try {
      await AudioPlayer.load({
        id: song.id,
        assetPath: song.localPath || song.streamUrl,
        loop: false,
        volume: 1.0,
        notification: {
          title: song.title,
          artist: song.artist,
          albumTitle: song.album,
          albumArt: song.artworkUrl,
        },
      });
      await AudioPlayer.play({ id: song.id });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pause = async (songId: string) => {
    try {
      await AudioPlayer.pause({ id: songId });
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const resume = async (songId: string) => {
    try {
      await AudioPlayer.play({ id: songId });
    } catch (error) {
      console.error('Error resuming audio:', error);
    }
  };

  const stop = async (songId: string) => {
    try {
      await AudioPlayer.stop({ id: songId });
      await AudioPlayer.unload({ id: songId });
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const seek = async (songId: string, time: number) => {
    // Not directly supported by the plugin, but can be implemented
    // by stopping and starting at a new position if needed.
    console.warn('Seek is not implemented in this version of the plugin.');
  };

  return { isPlaying, duration, currentTime, play, pause, resume, stop, seek };
};
