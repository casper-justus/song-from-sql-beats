
import { resolveMediaUrl } from './mediaCache';

interface DownloadProgress {
  songId: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
}

class DownloadManager {
  private downloads = new Map<string, DownloadProgress>();
  private listeners = new Set<(downloads: Map<string, DownloadProgress>) => void>();

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

    this.downloads.set(song.id, {
      songId: song.id,
      progress: 0,
      status: 'downloading'
    });
    this.notifyListeners();

    try {
      const audioFileKey = song.storage_path || song.file_url;
      const resolvedUrl = await resolveMediaUrl(audioFileKey, session, true);
      
      if (!resolvedUrl) {
        throw new Error('Could not resolve audio URL');
      }

      // Check if browser supports downloads
      if (!('showSaveFilePicker' in window) && !('webkitRequestFileSystem' in window)) {
        // Fallback: trigger browser download
        const link = document.createElement('a');
        link.href = resolvedUrl;
        link.download = `${song.title || 'song'}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.downloads.set(song.id, {
          songId: song.id,
          progress: 100,
          status: 'completed'
        });
      } else {
        // Progressive download with fetch
        const response = await fetch(resolvedUrl);
        if (!response.ok) throw new Error('Download failed');

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream not available');

        const chunks: Uint8Array[] = [];
        let downloaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          downloaded += value.length;

          if (total > 0) {
            const progress = Math.round((downloaded / total) * 100);
            this.downloads.set(song.id, {
              songId: song.id,
              progress,
              status: 'downloading'
            });
            this.notifyListeners();
          }
        }

        // Create blob and download
        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${song.title || 'song'}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);

        this.downloads.set(song.id, {
          songId: song.id,
          progress: 100,
          status: 'completed'
        });
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      this.downloads.set(song.id, {
        songId: song.id,
        progress: 0,
        status: 'error'
      });
      this.notifyListeners();
      return false;
    }
  }

  getDownloadStatus(songId: string): DownloadProgress | undefined {
    return this.downloads.get(songId);
  }

  getAllDownloads(): Map<string, DownloadProgress> {
    return new Map(this.downloads);
  }
}

export const downloadManager = new DownloadManager();
