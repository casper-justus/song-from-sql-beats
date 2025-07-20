import { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import type { AudioPlayerPlugin, AudioPlayerPluginEvents } from '@mediagrid/capacitor-native-audio';
const AudioPlayerPlugin = registerPlugin<AudioPlayerPlugin>('AudioPlayerPlugin');

const AUDIO_PLAYER_ID = "myMusicPlayer";

export const useNativeAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      try {
        await AudioPlayerPlugin.initialize({ audioPlayerId: AUDIO_PLAYER_ID, source: "" });

        AudioPlayerPlugin.addListener(AudioPlayerPluginEvents.StateChange, (state) => {
          setIsPlaying(state.isPlaying);
        });

        AudioPlayerPlugin.addListener(AudioPlayerPluginEvents.Progress, (info) => {
          setCurrentTime(info.currentTime);
          setDuration(info.duration);
        });
      } catch (error) {
        console.error('Error initializing audio player:', error);
      }
    };
    initialize();
  }, []);

  const play = async (song: { localPath?: string; streamUrl: string; album: string; artist: string; title: string; artworkUrl: string; }) => {
    try {
      await AudioPlayerPlugin.changeAudioSource({
        audioPlayerId: AUDIO_PLAYER_ID,
        source: song.localPath || song.streamUrl,
      });
      await AudioPlayerPlugin.changeMetadata({
        audioPlayerId: AUDIO_PLAYER_ID,
        albumTitle: song.album,
        artistName: song.artist,
        friendlyTitle: song.title,
        artworkSource: song.artworkUrl,
      });
      await AudioPlayerPlugin.play({ audioPlayerId: AUDIO_PLAYER_ID });
    } catch (error) {
      console.error(`Error playing song ${song.title}:`, error);
    }
  };

  const pause = async () => {
    await AudioPlayerPlugin.pause({ audioPlayerId: AUDIO_PLAYER_ID });
  };

  const resume = async () => {
    await AudioPlayerPlugin.play({ audioPlayerId: AUDIO_PLAYER_ID });
  };

  const stop = async () => {
    await AudioPlayerPlugin.stop({ audioPlayerId: AUDIO_PLAYER_ID });
  };

  const seek = async (timeInSeconds: number) => {
    await AudioPlayerPlugin.seek({
      audioPlayerId: AUDIO_PLAYER_ID,
      timeInSeconds: timeInSeconds,
    });
  };

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    resume,
    stop,
    seek,
  };
};
