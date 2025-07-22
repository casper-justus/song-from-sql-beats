import { useState, useEffect, useCallback } from 'react';
import { NativeAudio } from '@capacitor-community/native-audio';

interface UseNativeAudioProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const useNativeAudio = ({ onNext, onPrevious }: UseNativeAudioProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);

  useEffect(() => {
    const setupListeners = async () => {
      const onComplete = NativeAudio.addListener('complete', () => {
        onNext();
      });

      const onResume = NativeAudio.addListener('resume', () => {
        setIsPlaying(true);
      });

      const onPause = NativeAudio.addListener('pause', () => {
        setIsPlaying(false);
      });

      const onNext = NativeAudio.addListener('next', () => {
        onNext();
      });

      const onPrev = NativeAudio.addListener('prev', () => {
        onPrevious();
      });

      return () => {
        onComplete.then(l => l.remove());
        onResume.then(l => l.remove());
        onPause.then(l => l.remove());
        onNext.then(l => l.remove());
        onPrev.then(l => l.remove());
      };
    };

    const removeListeners = setupListeners();

    return () => {
      removeListeners.then(fn => fn());
    };
  }, [onNext, onPrevious]);

  const play = useCallback(async (song: { assetId: string, localPath?: string, streamUrl: string, title: string, artist: string, album: string, artworkUrl: string }) => {
    try {
      if (currentAssetId) {
        await stop(currentAssetId);
      }
      await NativeAudio.preload({
        assetId: song.assetId,
        assetPath: song.localPath || song.streamUrl,
        isUrl: true,
        volume: 1.0,
        audioChannelNum: 1,
      });

      await NativeAudio.play({ assetId: song.assetId });
      const { duration } = await NativeAudio.getDuration({ assetId: song.assetId });
      setDuration(duration);
      setCurrentAssetId(song.assetId);
      setIsPlaying(true);

      await NativeAudio.setNowPlaying({
        artwork: song.artworkUrl,
        artist: song.artist,
        album: song.album || '',
        track: song.title,
        duration: duration,
        elapsed: 0,
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, [currentAssetId]);

  const pause = useCallback(async (assetId: string) => {
    try {
      await NativeAudio.pause({ assetId });
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  }, []);

  const resume = useCallback(async (assetId: string) => {
    try {
      await NativeAudio.resume({ assetId });
      setIsPlaying(true);
    } catch (error) {
      console.error('Error resuming audio:', error);
    }
  }, []);

  const stop = useCallback(async (assetId: string) => {
    try {
      await NativeAudio.stop({ assetId });
      await NativeAudio.unload({ assetId });
      setIsPlaying(false);
      setCurrentAssetId(null);
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }, []);

  const seek = useCallback(async (assetId: string, time: number) => {
    try {
      await NativeAudio.seek({ assetId, time });
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPlaying && currentAssetId) {
        const { currentTime } = await NativeAudio.getCurrentTime({ assetId: currentAssetId });
        setCurrentTime(currentTime);
        NativeAudio.updateNowPlaying({
            elapsed: currentTime,
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentAssetId]);

  return { isPlaying, duration, currentTime, play, pause, resume, stop, seek };
};
