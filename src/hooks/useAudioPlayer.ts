
import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { loadPlaybackState, savePlaybackState } from '../utils/playerStorage';

export function useAudioPlayer(
  setCurrentTime: (time: number) => void,
  setDuration: (duration: number) => void,
  onEnded: () => void,
  currentSongId: string | null,
  setSongDuration: (songId: string, duration: number) => void
) {
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');

  const refs = useMemo(() => ({ A: audioRefA, B: audioRefB }), [audioRefA, audioRefB]);

  useEffect(() => {
    const audio = refs[activePlayer].current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };
    const updateDuration = () => {
      if (currentSongId) {
        setSongDuration(currentSongId, audio.duration);
      }
      setDuration(audio.duration);
    };
    const handleEnded = () => onEnded();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => console.error(`Audio Element Error on player ${activePlayer}:`, e));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', (e) => console.error("Audio Element Error (removed):", e));
    };
  }, [activePlayer, currentSongId, onEnded, refs, setCurrentTime, setDuration, setSongDuration]);

  const play = useCallback(() => {
    const audio = refs[activePlayer].current;
    if (audio) {
      audio.play().catch(e => console.error('Error playing audio:', e));
    }
  }, [activePlayer, refs]);

  const pause = useCallback(() => {
    const audio = refs[activePlayer].current;
    if (audio) {
      audio.pause();
      if (currentSongId) {
        savePlaybackState(currentSongId, audio.currentTime, audio.duration);
      }
    }
  }, [activePlayer, currentSongId, refs]);

  const load = useCallback((src: string, autoplay = false, onCanPlay?: () => void) => {
    const audio = refs[activePlayer].current;
    if (audio) {
      const handleCanPlay = () => {
        if (onCanPlay) {
          onCanPlay();
        }
        audio.removeEventListener('canplay', handleCanPlay);
      };
      audio.addEventListener('canplay', handleCanPlay);

      const playbackState = loadPlaybackState();
      if (playbackState && playbackState.songId === currentSongId) {
        audio.src = src;
        audio.currentTime = playbackState.currentTime;
      } else {
        audio.src = src;
        audio.currentTime = 0;
      }
      if (autoplay) {
        play();
      }
    }
  }, [activePlayer, currentSongId, play, refs]);

  const seek = useCallback((time: number) => {
    const audio = refs[activePlayer].current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, [activePlayer, setCurrentTime, refs]);

  const setVolume = useCallback((volume: number) => {
    if (audioRefA.current) audioRefA.current.volume = volume;
    if (audioRefB.current) audioRefB.current.volume = volume;
  }, []);

  // Effect to save playback state on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const audio = refs[activePlayer].current;
      if (audio && currentSongId && !audio.paused) {
        savePlaybackState(currentSongId, audio.currentTime, audio.duration);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activePlayer, currentSongId, refs]);

  return {
    audioRefA,
    audioRefB,
    activePlayerRef: refs[activePlayer],
    inactivePlayerRef: refs[activePlayer === 'A' ? 'B' : 'A'],
    setActivePlayer,
    play,
    pause,
    load,
    seek,
    setVolume,
  };
}
