
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Song = Tables<'songs'>;

const MusicPlayer = () => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([75]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (songs.length > 0 && !currentSong) {
      setCurrentSong(songs[0]);
    }
  }, [songs, currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  // Fetch lyrics when current song changes
  useEffect(() => {
    const fetchLyrics = async () => {
      if (currentSong?.lyrics_url) {
        try {
          const response = await fetch(currentSong.lyrics_url);
          if (response.ok) {
            const lyricsText = await response.text();
            setLyrics(lyricsText);
          } else {
            setLyrics('Lyrics not available');
          }
        } catch (error) {
          console.error('Error fetching lyrics:', error);
          setLyrics('Error loading lyrics');
        }
      } else {
        setLyrics('No lyrics available for this song');
      }
    };

    fetchLyrics();
  }, [currentSong]);

  const togglePlay = async () => {
    if (!audioRef.current || !currentSong) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Ensure the audio source is set correctly
        if (audioRef.current.src !== currentSong.file_url) {
          audioRef.current.src = currentSong.file_url;
        }
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const playNext = () => {
    if (!currentSong || songs.length === 0) return;
    
    const currentIndex = songs.findIndex(song => song.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(false);
  };

  const playPrevious = () => {
    if (!currentSong || songs.length === 0) return;
    
    const currentIndex = songs.findIndex(song => song.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(false);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(false);
    // Reset audio element when changing songs
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your music...</div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">No songs found in your library</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Music Player</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Player */}
          <Card className="bg-black/30 border-white/20 backdrop-blur-sm p-8">
            <div className="text-center mb-6">
              <div className="w-64 h-64 mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl">
                <img
                  src={currentSong?.cover_url || '/placeholder.svg'}
                  alt={`${currentSong?.title} cover`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{currentSong?.title}</h2>
              <p className="text-lg text-gray-300 mb-1">{currentSong?.artist}</p>
              {currentSong?.album && (
                <p className="text-gray-400">{currentSong.album}</p>
              )}
              {currentSong?.year && (
                <p className="text-gray-500 text-sm">{currentSong.year}</p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={playPrevious}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 w-16 h-16"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={playNext}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              {/* Lyrics Button */}
              <Dialog open={showLyrics} onOpenChange={setShowLyrics}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <FileText className="h-6 w-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{currentSong?.title} - Lyrics</DialogTitle>
                  </DialogHeader>
                  <div className="whitespace-pre-wrap text-sm">
                    {lyrics}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-white" />
              <Slider
                value={volume}
                max={100}
                step={1}
                onValueChange={setVolume}
                className="flex-1"
              />
              <span className="text-white text-sm w-10">{volume[0]}%</span>
            </div>

            {/* Audio Element */}
            {currentSong && (
              <audio
                ref={audioRef}
                src={currentSong.file_url}
                preload="metadata"
                onError={(e) => {
                  console.error('Audio error:', e);
                  setIsPlaying(false);
                }}
              />
            )}
          </Card>

          {/* Song List */}
          <Card className="bg-black/30 border-white/20 backdrop-blur-sm p-6">
            <h3 className="text-xl font-bold text-white mb-4">Your Library</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {songs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => handleSongSelect(song)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    currentSong?.id === song.id ? 'bg-white/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={song.cover_url || '/placeholder.svg'}
                        alt={`${song.title} cover`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{song.title}</p>
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                      {song.album && (
                        <p className="text-gray-500 text-xs truncate">{song.album}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {song.year && (
                        <span className="text-gray-400 text-sm">{song.year}</span>
                      )}
                      {song.genre && (
                        <p className="text-gray-500 text-xs">{song.genre}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
