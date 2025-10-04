import React from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Play, X, GripVertical, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useIsMobile } from '@/hooks/use-mobile';

export function QueueDialog() {
  const {
    queue,
    currentQueueIndex,
    isPlaying,
    showQueueDialog,
    setShowQueueDialog,
    playFromQueue,
    removeFromQueue,
    reorderQueueItem,
    clearQueue,
    songDurations,
  } = useMusicPlayer();
  const isMobile = useIsMobile();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderQueueItem(result.source.index, result.destination.index);
  };

  const formatDuration = (seconds: number | undefined) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '?:??';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
      <DialogContent className="max-w-md sm:max-w-lg w-[95vw] sm:w-[90vw] max-h-[80vh] sm:max-h-[85vh] bg-gray-900/80 border-gray-700 p-4 sm:p-6 overflow-hidden backdrop-blur-xl flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-white text-xl">Queue</DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{queue.length} songs</span>
              {queue.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearQueue}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <DialogDescription className="text-gray-400 text-sm">
            Drag and drop to reorder songs. The next song will play automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto mt-2 -mr-2 pr-2">
          {queue.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 py-16">
              <div className="text-center">
                <p>Queue is empty.</p>
                <p className="text-sm mt-1">Add songs to start listening.</p>
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="queue">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn("p-1 space-y-2", snapshot.isDraggingOver && "bg-gray-800/50 rounded-lg")}
                  >
                    {queue.map((song, index) => (
                      <Draggable key={song.id} draggableId={song.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "group flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                              index === currentQueueIndex && "bg-green-500/20",
                              snapshot.isDragging && "shadow-xl bg-gray-700/60"
                            )}
                          >
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing py-2"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>

                            {/* Album art & Play Button */}
                            <button
                              onClick={() => playFromQueue(index)}
                              className="relative flex-shrink-0 group/cover"
                            >
                              <ResolvedCoverImage
                                imageKey={song.cover_url}
                                videoId={song.video_id}
                                altText={song.title || 'Song cover'}
                                className="w-12 h-12 rounded object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
                                {index === currentQueueIndex && isPlaying
                                  ? <Pause className="w-6 h-6 text-white" />
                                  : <Play className="w-6 h-6 text-white" />
                                }
                              </div>
                            </button>

                            {/* Song info */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "font-medium text-sm truncate",
                                index === currentQueueIndex ? "text-green-400" : "text-white"
                              )}>
                                {song.title || "Unknown Title"}
                              </p>
                              <p className="text-gray-400 text-xs truncate">
                                {song.artist || "Unknown Artist"}
                              </p>
                            </div>

                            {/* Duration */}
                            <div className="text-gray-400 text-xs px-2">
                              {formatDuration(songDurations[song.id] || song.duration)}
                            </div>

                            {/* Remove button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromQueue(index)}
                              className={cn(
                                "w-8 h-8 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded-full",
                                isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                "transition-opacity"
                              )}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}