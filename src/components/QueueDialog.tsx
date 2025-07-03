
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X, SkipForward } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';

export function QueueDialog() {
  const {
    queue,
    currentQueueIndex,
    showQueueDialog,
    setShowQueueDialog,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    addToQueue
  } = useMusicPlayer();

  return (
    <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Queue ({queue.length} songs)</span>
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
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No songs in queue</p>
            </div>
          ) : (
            queue.map((song, index) => (
              <div
                key={`${song.id}-${index}`}
                className={cn(
                  "p-3 rounded-lg transition-all duration-200 hover:bg-white/10 group flex items-center gap-3",
                  index === currentQueueIndex ? 'bg-green-500/20 border border-green-500/30' : ''
                )}
              >
                {/* Queue position */}
                <div className="w-8 text-center text-sm text-gray-400">
                  {index === currentQueueIndex ? (
                    <Play className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Album art */}
                <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700">
                  <ResolvedCoverImage
                    imageKey={song.cover_url}
                    videoId={song.video_id}
                    altText={song.title || 'Song cover'}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    index === currentQueueIndex ? 'text-green-500' : 'text-white'
                  )}>
                    {song.title || "Unknown Title"}
                  </p>
                  <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                  {song.album && (
                    <p className="text-gray-500 text-xs truncate">{song.album}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index !== currentQueueIndex && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => playFromQueue(index)}
                      className="text-white hover:bg-white/20 w-8 h-8"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromQueue(index)}
                    className="text-red-400 hover:bg-red-400/20 w-8 h-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {queue.length > 0 && (
          <div className="border-t border-gray-700 pt-4 mt-4">
            <p className="text-sm text-gray-400 text-center">
              Currently playing: {currentQueueIndex + 1} of {queue.length}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
