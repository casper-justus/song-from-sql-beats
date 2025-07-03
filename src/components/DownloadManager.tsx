
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Pause, Play, X, Trash2 } from 'lucide-react';
import { downloadManager } from '@/utils/downloadManager';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useSession } from '@clerk/clerk-react';

interface DownloadProgress {
  songId: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error' | 'paused';
  fileName?: string;
  error?: string;
}

export function DownloadManager() {
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map());
  const [showDialog, setShowDialog] = useState(false);
  const { songs } = useMusicPlayer();
  const { session } = useSession();

  useEffect(() => {
    const unsubscribe = downloadManager.addListener(setDownloads);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleDownload = async (song: any) => {
    if (session) {
      await downloadManager.downloadSong(song, session);
    }
  };

  const handleCancel = (songId: string) => {
    downloadManager.cancelDownload(songId);
  };

  const handlePause = (songId: string) => {
    downloadManager.pauseDownload(songId);
  };

  const handleResume = async (songId: string) => {
    const song = songs.find(s => s.id === songId);
    if (song && session) {
      await downloadManager.resumeDownload(songId, song, session);
    }
  };

  const clearCompleted = () => {
    downloadManager.clearCompleted();
  };

  const activeDownloads = Array.from(downloads.values()).filter(d => d.status === 'downloading');
  const completedDownloads = Array.from(downloads.values()).filter(d => d.status === 'completed');
  const errorDownloads = Array.from(downloads.values()).filter(d => d.status === 'error');

  return (
    <>
      {/* Download button that shows active downloads count */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDialog(true)}
        className="relative text-white hover:bg-white/20"
      >
        <Download className="h-5 w-5" />
        {activeDownloads.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeDownloads.length}
          </span>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Downloads</span>
              {completedDownloads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCompleted}
                  className="text-gray-400 hover:text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Completed
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Active Downloads */}
            {activeDownloads.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Active Downloads</h3>
                {activeDownloads.map((download) => (
                  <div key={download.songId} className="p-3 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium truncate">{download.fileName}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePause(download.songId)}
                          className="w-8 h-8"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(download.songId)}
                          className="w-8 h-8 text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={download.progress} className="flex-1" />
                      <span className="text-sm text-gray-400">{Math.round(download.progress)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Downloads */}
            {completedDownloads.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-400">Completed</h3>
                {completedDownloads.map((download) => (
                  <div key={download.songId} className="p-3 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate text-green-400">{download.fileName}</span>
                      <span className="text-sm text-green-400">✓ Complete</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error Downloads */}
            {errorDownloads.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-red-400">Failed Downloads</h3>
                {errorDownloads.map((download) => (
                  <div key={download.songId} className="p-3 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate text-red-400">{download.fileName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const song = songs.find(s => s.id === download.songId);
                          if (song) handleDownload(song);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Retry
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400">{download.error}</p>
                  </div>
                ))}
              </div>
            )}

            {downloads.size === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No downloads yet</p>
                <p className="text-sm">Download songs to listen offline</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DownloadManager;
