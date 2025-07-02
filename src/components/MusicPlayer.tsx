import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, FileText, Heart } from 'lucide-react'; // Added Heart
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // For conditional styling of Heart icon
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Tables } from '@/integrations/supabase/types';
import ResolvedCoverImage from './ResolvedCoverImage'; // Import ResolvedCoverImage

type Song = Tables<'songs'>;

const MusicPlayer = () => {
  const {
    songs,
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume, // This is 0-100 from context
    isLoadingSongs,
    lyrics,
    showLyricsDialog,
    isCurrentSongLiked, // Get like status
    toggleLikeSong,     // Get toggle function
    togglePlay,
    playNext,
    playPrevious,
    selectSong,
    seek,
    setVolumeLevel,
    setShowLyricsDialog,
  } = useMusicPlayer();

  const handleLikeClick = () => {
    if (currentSong) {
      toggleLikeSong(currentSong.id, currentSong.video_id);
    }
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolumeLevel(value[0]);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // The initial loading/error/no songs states might be better handled on the page level (e.g. Index.tsx)
  // or this component can return null/message if context indicates no songs or loading.
  // For now, we'll keep some basic loading/empty states.

  if (isLoadingSongs) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white text-xl">Loading your music...</div>
      </div>
    );
  }

  // If there's no current song selected yet, but songs are loaded,
  // it might mean the context's auto-selection hasn't picked one or there are no songs.
  // The BottomNavbar will show "No music selected". This full player could show a similar message or list.
  if (songs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Songs Found</h2>
          <p className="text-lg">Your music library is empty.</p>
        </div>
      </div>
    );
  }

  if (!currentSong && songs.length > 0) {
    // This case should ideally be handled by the context auto-selecting the first song.
    // If not, we can prompt user to select a song from the list.
     return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Select a Song</h2>
          <p className="text-lg">Choose a song from your library to start playing.</p>
        </div>
      </div>
    );
  }

  // If there's still no currentSong after all checks (e.g. songs list is empty and remains empty)
  // This is a fallback, though the previous `songs.length === 0` check should catch it.
  if (!currentSong) {
    return (
         <div className="flex items-center justify-center p-8">
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">Music Unavailable</h2>
              <p className="text-lg">No song is currently selected or available.</p>
            </div>
          </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Player UI Card */}
          <Card className="bg-black/30 border-white/20 backdrop-blur-sm p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-48 h-48 md:w-64 md:h-64 mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl bg-gray-700">
                <ResolvedCoverImage
                  imageKey={currentSong.cover_url}
                  videoId={currentSong.video_id} // Pass video_id for YouTube thumbnail
                  altText={currentSong.title || 'Album cover'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{currentSong.title || "Unknown Title"}</h2>
              <p className="text-lg text-gray-300 mb-1">{currentSong.artist}</p>
              {currentSong.album && (
                <p className="text-gray-400">{currentSong.album}</p>
              )}
              {currentSong.year && (
                <p className="text-gray-500 text-sm">{currentSong.year}</p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <Slider
                value={[currentTime]}
                max={duration || 100} // Ensure max is not 0
                step={1}
                onValueChange={handleSeek} // Use the updated handler
                className="w-full"
                disabled={!currentSong || duration === 0}
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
                disabled={!currentSong}
              >
                <SkipBack className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 w-16 h-16"
                disabled={!currentSong}
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
                disabled={!currentSong}
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              {/* Like Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLikeClick}
                className={cn(
                  "text-white hover:bg-white/20",
                  isCurrentSongLiked && "text-spotifyGreen" // Or your chosen liked color
                )}
                disabled={!currentSong}
              >
                <Heart className={cn("h-6 w-6", isCurrentSongLiked && "fill-current")} />
              </Button>

              {/* Lyrics Button */}
              <Dialog open={showLyricsDialog} onOpenChange={setShowLyricsDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    disabled={!currentSong}
                  >
                    <FileText className="h-6 w-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>{currentSong.title} - Lyrics</DialogTitle>
                  </DialogHeader>
                  <div className="whitespace-pre-wrap text-sm py-4">
                    {lyrics || "Lyrics not available or loading..."}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-white" />
              <Slider
                value={[volume]} // Use volume from context (0-100)
                max={100}
                step={1}
                onValueChange={handleVolumeChange} // Use the updated handler
                className="flex-1"
                disabled={!currentSong}
              />
              <span className="text-white text-sm w-10">{Math.round(volume)}%</span>
            </div>
            {/* Audio element is now managed by MusicPlayerContext */}
          </Card>

          {/* Song List */}
          <Card className="bg-black/30 border-white/20 backdrop-blur-sm p-6">
            <h3 className="text-xl font-bold text-white mb-4">Your Library ({songs.length} songs)</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto"> {/* Adjusted max height */}
              {songs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => selectSong(song)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    currentSong?.id === song.id ? 'bg-white/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700">
                      <ResolvedCoverImage
                        imageKey={song.cover_url}
                        videoId={song.video_id} // Pass video_id for YouTube thumbnail
                        altText={song.title || 'Song cover'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{song.title || "Unknown Title"}</p>
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
