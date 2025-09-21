import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X, GripVertical } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import ResolvedCoverImage from './ResolvedCoverImage';
import { useVirtualizer } from '@tanstack/react-virtual';

export function QueueDialog() {
  const {
    queue,
    currentQueueIndex,
    showQueueDialog,
    setShowQueueDialog,
    playFromQueue,
    removeFromQueue,
    reorderQueueItem,
    clearQueue,
  } = useMusicPlayer();

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76, // Estimate size of each row: p-3 (12*2=24) + h-12 (48) + gap (4) = 76
    overscan: 5,
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    reorderQueueItem(result.source.index, result.destination.index);
  };

  return (
    <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-800 text-white border-gray-700 flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Queue ({queue.length} songs)</span>
            {queue.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearQueue} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                Clear All
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div ref={parentRef} className="max-h-[calc(60vh-50px)] overflow-y-auto flex-grow">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No songs in queue</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable
                droppableId="queue"
                mode="virtual"
                renderClone={(provided, snapshot, rubric) => {
                  const song = queue[rubric.source.index];
                  return (
                    <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef} className="p-3 rounded-lg group flex items-center gap-3 bg-blue-500/50 shadow-lg text-white">
                      <GripVertical className="w-5 h-5" />
                      <span>{song.title}</span>
                    </div>
                  );
                }}
              >
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                      const song = queue[virtualItem.index];
                      // The key and draggableId MUST be unique. Using the index in the queue
                      // ensures this, even if the same song appears multiple times.
                      const draggableId = `${song.id}-${virtualItem.index}`;
                      return (
                        <Draggable key={draggableId} draggableId={draggableId} index={virtualItem.index}>
                          {(providedDraggable) => (
                            <div
                              {...providedDraggable.draggableProps}
                              ref={providedDraggable.innerRef}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}
                              className={cn("p-3 rounded-lg group flex items-center gap-3", virtualItem.index === currentQueueIndex ? 'bg-green-500/20' : 'bg-gray-700/30 hover:bg-white/10')}
                            >
                              <div {...providedDraggable.dragHandleProps} className="text-gray-500 hover:text-white cursor-grab pr-2">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="w-8 text-center text-sm text-gray-400">
                                {virtualItem.index === currentQueueIndex ? <Play className="w-4 h-4 text-green-500 mx-auto" /> : <span>{virtualItem.index + 1}</span>}
                              </div>
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700">
                                <ResolvedCoverImage imageKey={song.cover_url} videoId={song.video_id} altText={song.title || 'Song cover'} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-medium truncate text-sm", virtualItem.index === currentQueueIndex ? 'text-green-400' : 'text-white')}>{song.title || "Unknown Title"}</p>
                                <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {virtualItem.index !== currentQueueIndex && (
                                  <Button variant="ghost" size="icon" onClick={() => playFromQueue(virtualItem.index)} className="text-white hover:bg-white/20 w-7 h-7 sm:w-8 sm:h-8" title="Play this song">
                                    <Play className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => removeFromQueue(virtualItem.index)} className="text-red-400 hover:bg-red-400/20 w-7 h-7 sm:w-8 sm:h-8" title="Remove from queue">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

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
