
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X, SkipForward, Shuffle, Repeat, Heart, Download, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useSession } from '@clerk/clerk-react';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';
import { downloadManager } from '@/utils/downloadManager';

export function QueueDialog() {
  const {
    queue,
    currentQueueIndex,
    showQueueDialog,
    setShowQueueDialog,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    addToQueue,
    toggleLikeSong,
    isCurrentSongLiked,
    likedSongIds
  } = useMusicPlayer();
  
  const { session } = useSession();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDownload = async (song: any) => {
    if (session) {
      await downloadManager.downloadSong(song, session);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    // Handle queue reordering logic here
    console.log(`Move song from ${draggedIndex} to ${dropIndex}`);
    setDraggedIndex(null);
  };

  return (
    <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-gray-900/95 backdrop-blur-md text-white border-gray-700/50">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <span>Up Next</span>
              <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                {queue.length} songs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Shuffle
              </Button>
              {queue.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearQueue}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  Clear All
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-1 max-h-[65vh] overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">Your queue is empty</h3>
              <p className="text-sm">Add songs to see them here</p>
            </div>
          ) : (
            queue.map((song, index) => {
              const isCurrentlyPlaying = index === currentQueueIndex;
              const isLiked = likedSongIds.has(song.id);
              
              return (
                <div
                  key={`${song.id}-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    "group p-3 rounded-lg transition-all duration-200 hover:bg-white/5 cursor-pointer",
                    "flex items-center gap-4 border border-transparent hover:border-white/10",
                    isCurrentlyPlaying && 'bg-green-500/10 border-green-500/30 shadow-lg',
                    draggedIndex === index && 'opacity-50'
                  )}
                >
                  {/* Play indicator / Queue number */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isCurrentlyPlaying ? (
                      <div className="w-4 h-4 mx-auto">
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-3 bg-green-500 rounded animate-pulse"></div>
                          <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-2 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 group-hover:hidden">
                        {index + 1}
                      </span>
                    )}
                    {!isCurrentlyPlaying && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => playFromQueue(index)}
                        className="w-8 h-8 text-white hover:bg-white/20 hidden group-hover:flex"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Album art */}
                  <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-700 shadow-md">
                    <ResolvedCoverImage
                      imageKey={song.cover_url}
                      videoId={song.video_id}
                      altText={song.title || 'Song cover'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>

                  {/* Song info */}
                  <div className="flex-1 min-w-0" onClick={() => !isCurrentlyPlaying && playFromQueue(index)}>
                    <p className={cn(
                      "font-medium truncate text-white",
                      isCurrentlyPlaying && 'text-green-400'
                    )}>
                      {song.title || "Unknown Title"}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artist}
                      {song.album && <span className="mx-1">•</span>}
                      {song.album}
                    </p>
                    {song.year && (
                      <p className="text-gray-500 text-xs">{song.year}</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="text-sm text-gray-400 w-12 text-right">
                    3:45
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeSong(song.id, song.video_id || '');
                      }}
                      className={cn(
                        "w-8 h-8",
                        isLiked ? "text-red-500" : "text-gray-400 hover:text-white"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(song);
                      }}
                      className="w-8 h-8 text-gray-400 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-gray-400 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-600" align="end">
                        <DropdownMenuItem 
                          onClick={() => removeFromQueue(index)}
                          className="text-red-400 hover:bg-red-400/10"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove from queue
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-gray-700">
                          Add to playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-gray-700">
                          Go to artist
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-gray-700">
                          Go to album
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {queue.length > 0 && (
          <div className="border-t border-gray-700/50 pt-4 mt-4 bg-gray-800/30 -mx-6 px-6 rounded-b-lg">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                {currentQueueIndex + 1} of {queue.length} • 
                <span className="ml-1">Next: {queue[currentQueueIndex + 1]?.title || 'End of queue'}</span>
              </span>
              <div className="flex items-center gap-4">
                <span>Total: ~{Math.floor(queue.length * 3.5)} min</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
