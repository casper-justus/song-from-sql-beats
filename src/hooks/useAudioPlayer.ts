
import { useRef, useEffect, useCallback, useState } from 'react';

export function useAudioPlayer(
  setCurrentTime: (time: number) => void,
  setDuration: (duration: number) => void,
  onEnded: () => void
) {
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');

  const refs = { A: audioRefA, B: audioRefB };

  useEffect(() => {
    const audio = refs[activePlayer].current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      onEnded();
    };
    const handleCanPlay = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => {
      console.error(`Audio Element Error on player ${activePlayer}:`, e);
    });

    // We also need to listen to the inactive player for when it's ready to play
    const inactivePlayer = refs[activePlayer === 'A' ? 'B' : 'A'].current;
    if (inactivePlayer) {
      // Optional: handle canplay for inactive player to know when it's buffered
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', (e) => console.error("Audio Element Error (removed):", e));
    };
  }, [activePlayer, setCurrentTime, setDuration, onEnded]);

  const seek = useCallback((time: number) => {
    const audio = refs[activePlayer].current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, [activePlayer, setCurrentTime]);

  const setVolume = useCallback((volume: number) => {
    if (audioRefA.current) audioRefA.current.volume = volume;
    if (audioRefB.current) audioRefB.current.volume = volume;
  }, []);

  return {
    audioRefA,
    audioRefB,
    activePlayerRef: refs[activePlayer],
    inactivePlayerRef: refs[activePlayer === 'A' ? 'B' : 'A'],
    setActivePlayer,
    seek,
    setVolume,
  };
}
