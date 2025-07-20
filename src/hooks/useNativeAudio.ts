import { useState, useEffect } from 'react';
import { NativeAudio } from '@capacitor-community/native-audio';

export const useNativeAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const onPlaying = NativeAudio.addListener('audioPlaying', () => setIsPlaying(true));
    const onPaused = NativeAudio.addListener('audioPaused', () => setIsPlaying(false));
    const onEnded = NativeAudio.addListener('audioFinished', () => setIsPlaying(false));
    const onError = NativeAudio.addListener('audioError', (error) => console.error('Audio playback error:', error));

    return () => {
      onPlaying.remove();
      onPaused.remove();
      onEnded.remove();
      onError.remove();
    };
  }, []);

  const play = async (song: { assetId: string, localPath?: string, streamUrl: string, title: string, artist: string, album: string, artworkUrl: string }) => {
    try {
      await NativeAudio.preload({
        assetId: song.assetId,
        assetPath: song.localPath || song.streamUrl,
        audioType: 'file',
        isUrl: !!song.streamUrl,
      });
      await NativeAudio.play({ assetId: song.assetId });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pause = async () => {
    try {
      await NativeAudio.pause();
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const resume = async () => {
    try {
      await NativeAudio.resume();
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

  const seek = async (time: number) => {
    try {
      await NativeAudio.seek({ time });
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPlaying) {
        const { currentTime } = await NativeAudio.getCurrentTime();
        setCurrentTime(currentTime);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return { isPlaying, duration, currentTime, play, pause, resume, stop, seek };
};
