
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X, SkipForward, GripVertical } from 'lucide-react'; // Added GripVertical
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'; // Added
import ResolvedCoverImage from './ResolvedCoverImage';

export function QueueDialog() {
  const {
    queue,
    currentQueueIndex,
    showQueueDialog,
    setShowQueueDialog,
    playFromQueue,
    removeFromQueue,
    reorderQueueItem, // Added
    clearQueue,
    // addToQueue // Not directly used in dialog, but available in context
  } = useMusicPlayer();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return; // Dropped outside the list
    }
    if (result.destination.index === result.source.index) {
      return; // Dropped in the same place
    }
    reorderQueueItem(result.source.index, result.destination.index);
  };

  return (
    <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-800 text-white border-gray-700 flex flex-col">
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
        
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="queue">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 max-h-[calc(60vh-50px)] overflow-y-auto flex-grow" // Adjusted max-h
              >
                {queue.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No songs in queue</p>
                  </div>
                ) : (
                  queue.map((song, index) => (
                    <Draggable key={`${song.id}-${index}`} draggableId={`${song.id}-${index}`} index={index}>
                      {(providedDraggable, snapshot) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          className={cn(
                            "p-3 rounded-lg transition-all duration-200 group flex items-center gap-3",
                            index === currentQueueIndex ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-700/30 hover:bg-white/10',
                            snapshot.isDragging && 'bg-blue-500/30 shadow-lg'
                          )}
                        >
                          {/* Drag Handle */}
                          <div {...providedDraggable.dragHandleProps} className="text-gray-500 hover:text-white cursor-grab pr-2">
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* Queue position (visual only, actual index is from map) */}
                          <div className="w-8 text-center text-sm text-gray-400">
                            {index === currentQueueIndex ? (
                              <Play className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>

                          {/* Album art */}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700">
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
                              "font-medium truncate text-sm",
                              index === currentQueueIndex ? 'text-green-400' : 'text-white'
                            )}>
                              {song.title || "Unknown Title"}
                            </p>
                            <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {index !== currentQueueIndex && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => playFromQueue(index)}
                                className="text-white hover:bg-white/20 w-7 h-7 sm:w-8 sm:h-8"
                                title="Play this song"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromQueue(index)}
                              className="text-red-400 hover:bg-red-400/20 w-7 h-7 sm:w-8 sm:h-8"
                              title="Remove from queue"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {queue.length > 0 && (
          <div className="border-t border-gray-700 pt-3 mt-auto text-xs text-gray-500 text-center">
            <p className="text-sm text-gray-400 text-center">
              Currently playing: {currentQueueIndex + 1} of {queue.length}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
