
import { useRef, useEffect, useCallback } from 'react';

export function useAudioPlayer(
  currentTime: number,
  setCurrentTime: (time: number) => void,
  setDuration: (duration: number) => void,
  setIsPlaying: (playing: boolean) => void,
  playNext: () => void
) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handleCanPlay = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => {
      console.error("Audio Element Error:", e);
      setIsPlaying(false);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', (e) => console.error("Audio Element Error (removed):", e));
    };
  }, [setCurrentTime, setDuration, setIsPlaying, playNext]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [setCurrentTime]);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  return {
    audioRef,
    seek,
    setVolume
  };
}
