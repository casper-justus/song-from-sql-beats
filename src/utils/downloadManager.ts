
import { resolveMediaUrl } from './mediaCache';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileTransfer, FileTransferObject } from '@capacitor-community/file-transfer';

interface DownloadProgress {
  songId: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error' | 'paused';
  fileName?: string;
  error?: string;
}

class DownloadManager {
  private downloads = new Map<string, DownloadProgress>();
  private listeners = new Set<(downloads: Map<string, DownloadProgress>) => void>();
  private abortControllers = new Map<string, AbortController>();

  addListener(callback: (downloads: Map<string, DownloadProgress>) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(new Map(this.downloads)));
  }

  async downloadSong(song: any, session: any): Promise<boolean> {
    if (this.downloads.has(song.id)) {
      console.log('Song already downloading or downloaded');
      return false;
    }

    const originalUrl = song.storage_path || song.file_url || '';
    const extension = originalUrl.split('.').pop() || 'mp3'; // Default to mp3 if no extension
    const mimeType = extension === 'opus' ? 'audio/opus' : 'audio/mpeg'; // Basic MIME type inference

    const fileName = `${song.artist ? `${song.artist} - ` : ''}${song.title || 'Unknown Song'}.${extension}`;
    const abortController = new AbortController();
    this.abortControllers.set(song.id, abortController);

    this.downloads.set(song.id, {
      songId: song.id,
      progress: 0,
      status: 'downloading',
      fileName
    });
    this.notifyListeners();

    try {
      const audioFileKey = song.storage_path || song.file_url;
      const resolvedUrl = await resolveMediaUrl(audioFileKey, session, true, 'high');
      
      if (!resolvedUrl) {
        throw new Error('Could not resolve audio URL');
      }

      // Update progress to show URL resolution completed
      this.downloads.set(song.id, {
        songId: song.id,
        progress: 10,
        status: 'downloading',
        fileName
      });
      this.notifyListeners();

      const fileTransfer: FileTransferObject = FileTransfer.create();
      const uri = encodeURI(resolvedUrl);
      const path = `${Directory.Data}/${fileName}`;

      fileTransfer.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.downloads.set(song.id, {
            songId: song.id,
            progress,
            status: 'downloading',
            fileName
          });
          this.notifyListeners();
        }
      };

      const entry = await fileTransfer.download(uri, path);

      this.downloads.set(song.id, {
        songId: song.id,
        progress: 100,
        status: 'completed',
        fileName
      });
      this.notifyListeners();

      // Add to localStorage
      try {
        const downloadedSongs = JSON.parse(localStorage.getItem('downloadedSongsList') || '[]');
        const existingEntry = downloadedSongs.find((ds: any) => ds.songId === song.id);
        if (!existingEntry) {
          downloadedSongs.push({
            songId: song.id,
            title: song.title || 'Unknown Title',
            artist: song.artist || 'Unknown Artist',
            fileName,
            downloadedAt: new Date().toISOString(),
            localPath: entry.toURL()
          });
          localStorage.setItem('downloadedSongsList', JSON.stringify(downloadedSongs));
        }
      } catch (e) {
        console.error("Failed to update localStorage for downloads", e);
      }

      return true;
    } catch (error) {
      console.error('Download failed:', error);
      this.abortControllers.delete(song.id);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.downloads.set(song.id, {
        songId: song.id,
        progress: 0,
        status: 'error',
        fileName,
        error: errorMessage
      });
      this.notifyListeners();
      return false;
    }
  }

  cancelDownload(songId: string): boolean {
    const controller = this.abortControllers.get(songId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(songId);
      this.downloads.delete(songId);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  pauseDownload(songId: string): boolean {
    const download = this.downloads.get(songId);
    if (download && download.status === 'downloading') {
      this.downloads.set(songId, {
        ...download,
        status: 'paused'
      });
      this.notifyListeners();
      return true;
    }
    return false;
  }

  resumeDownload(songId: string, song: any, session: any): Promise<boolean> {
    const download = this.downloads.get(songId);
    if (download && download.status === 'paused') {
      this.downloads.delete(songId); // Remove paused state
      return this.downloadSong(song, session); // Restart download
    }
    return Promise.resolve(false);
  }

  clearCompleted(): void {
    const completed = Array.from(this.downloads.entries())
      .filter(([_, download]) => download.status === 'completed')
      .map(([songId]) => songId);
    
    completed.forEach(songId => {
      this.downloads.delete(songId);
    });
    
    if (completed.length > 0) {
      this.notifyListeners();
    }
  }

  getDownloadStatus(songId: string): DownloadProgress | undefined {
    return this.downloads.get(songId);
  }

  getAllDownloads(): Map<string, DownloadProgress> {
    return new Map(this.downloads);
  }

  getActiveDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values())
      .filter(download => download.status === 'downloading');
  }

  getCompletedDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values())
      .filter(download => download.status === 'completed');
  }
}

export const downloadManager = new DownloadManager();
