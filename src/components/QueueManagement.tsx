import React from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResolvedCoverImage from './ResolvedCoverImage';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

export function QueueDialog() {
  const {
    queue,
    currentQueueIndex,
    currentSong,
    isPlaying,
    showQueueDialog,
    setShowQueueDialog,
    playFromQueue,
    removeFromQueue,
    reorderQueueItem,
    clearQueue,
  } = useMusicPlayer();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    if (startIndex !== endIndex) {
      reorderQueueItem(startIndex, endIndex);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
      <DialogContent className="max-w-md w-full h-[80vh] bg-gray-900 border-gray-700 p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <DialogHeader className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">Queue</DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{queue.length} songs</span>
                {queue.length > 0 && (
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
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8" />
                  </div>
                  <p>Queue is empty</p>
                  <p className="text-sm mt-1">Add songs to start listening</p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="queue">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "p-2 space-y-1",
                        snapshot.isDraggingOver && "bg-gray-800/50"
                      )}
                    >
                      {queue.map((song, index) => (
                        <Draggable key={song.id} draggableId={song.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "bg-gray-800/40 border-gray-700 transition-all duration-200 hover:bg-gray-700/50",
                                index === currentQueueIndex && "bg-green-500/20 border-green-500/50",
                                snapshot.isDragging && "shadow-xl rotate-2 scale-105"
                              )}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                  {/* Drag handle */}
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>

                                  {/* Queue position / play indicator */}
                                  <div className="w-6 text-center">
                                    {index === currentQueueIndex && isPlaying ? (
                                      <div className="w-4 h-4 mx-auto">
                                        <div className="grid grid-cols-3 gap-0.5 h-full">
                                          <div className="bg-green-400 animate-pulse"></div>
                                          <div className="bg-green-400 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                          <div className="bg-green-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className={cn(
                                        "text-sm",
                                        index === currentQueueIndex ? "text-green-400 font-medium" : "text-gray-500"
                                      )}>
                                        {index + 1}
                                      </span>
                                    )}
                                  </div>

                                  {/* Album art */}
                                  <button
                                    onClick={() => playFromQueue(index)}
                                    className="flex-shrink-0 hover:scale-105 transition-transform"
                                  >
                                    <ResolvedCoverImage
                                      imageKey={song.cover_url}
                                      videoId={song.video_id}
                                      altText={song.title || 'Song cover'}
                                      className="w-10 h-10 rounded object-cover"
                                    />
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
                                  <div className="text-gray-400 text-xs">
                                    3:45
                                  </div>

                                  {/* Remove button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromQueue(index);
                                    }}
                                    className="w-8 h-8 text-gray-500 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}