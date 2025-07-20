import { useState, useEffect } from 'react';
import { NativeAudio } from '@capacitor-community/native-audio';

export const useNativeAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const setupListeners = async () => {
      const onComplete = await NativeAudio.addListener('complete', (event) => {
        setIsPlaying(false);
      });

      return () => {
        onComplete.remove();
      };
    };

    const removeListeners = setupListeners();

    return () => {
      removeListeners.then(fn => fn());
    };
  }, []);

  const play = async (song: { assetId: string, localPath?: string, streamUrl: string, title: string, artist: string, album: string, artworkUrl: string }) => {
    try {
      await NativeAudio.preload({
        assetId: song.assetId,
        assetPath: song.localPath || song.streamUrl,
        isUrl: !!song.streamUrl,
        volume: 1.0,
        audioChannelNum: 1,
      });
      await NativeAudio.play({ assetId: song.assetId });
      const { duration } = await NativeAudio.getDuration({ assetId: song.assetId });
      setDuration(duration);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pause = async (assetId: string) => {
    try {
      await NativeAudio.pause({ assetId });
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const resume = async (assetId: string) => {
    try {
      await NativeAudio.resume({ assetId });
    } catch (error) {
      console.error('Error resuming audio:', error);
    }
  };

  const stop = async (assetId: string) => {
    try {
      await NativeAudio.stop({ assetId });
      await NativeAudio.unload({ assetId });
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const seek = async (assetId: string, time: number) => {
    // Not directly supported by the plugin, but can be implemented
    // by stopping and starting at a new position if needed.
    console.warn('Seek is not implemented in this version of the plugin.');
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPlaying) {
        const { currentTime } = await NativeAudio.getCurrentTime({ assetId: '' });
        setCurrentTime(currentTime);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return { isPlaying, duration, currentTime, play, pause, resume, stop, seek };
};
