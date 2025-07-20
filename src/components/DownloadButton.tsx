
import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadSong, deleteDownloadedSong, isSongDownloaded } from '@/utils/offlinePlayback';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Song = Tables<'songs'> & {
  isDownloaded?: boolean;
  localPath?: string;
  streamUrl?: string;
};

interface DownloadButtonProps {
  song: Song;
  className?: string;
}

type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error' | 'downloaded';

export function DownloadButton({ song, className }: DownloadButtonProps) {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      const localPath = await isSongDownloaded(song.id);
      if (localPath) {
        setDownloadStatus('downloaded');
      }
    };
    checkStatus();
  }, [song.id]);

  const handleDownload = async () => {
    if (downloadStatus === 'downloading' || downloadStatus === 'downloaded') return;

    setDownloadStatus('downloading');
    setProgress(0);

    const streamUrl = song.storage_path || song.file_url;
    if (!streamUrl) {
      setDownloadStatus('error');
      return;
    }

    const downloadedPath = await downloadSong({ ...song, streamUrl, isDownloaded: false });

    if (downloadedPath) {
      setDownloadStatus('completed');
      setTimeout(() => setDownloadStatus('downloaded'), 2000);
    } else {
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  const handleDelete = async () => {
    await deleteDownloadedSong(song.id);
    setDownloadStatus('idle');
  };

  const getIcon = () => {
    switch (downloadStatus) {
      case 'downloading':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
      case 'downloaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getVariant = () => {
    switch (downloadStatus) {
      case 'completed':
      case 'downloaded':
        return 'ghost';
      case 'error':
        return 'destructive';
      default:
        return 'ghost';
    }
  };

  const handleClick = () => {
    if (downloadStatus === 'downloaded') {
      handleDelete();
    } else {
      handleDownload();
    }
  };

  return (
    <Button
      variant={getVariant()}
      size="icon"
      onClick={handleClick}
      disabled={downloadStatus === 'downloading'}
      className={cn(
        "transition-all duration-200",
        className
      )}
      title={
        downloadStatus === 'downloading'
          ? `Downloading... ${progress}%`
          : downloadStatus === 'completed'
          ? 'Downloaded successfully'
          : downloadStatus === 'downloaded'
          ? 'Delete from device'
          : downloadStatus === 'error'
          ? 'Download failed'
          : 'Download song'
      }
    >
      {getIcon()}
    </Button>
  );
}
