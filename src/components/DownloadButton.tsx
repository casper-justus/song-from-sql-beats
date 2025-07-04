
import React, { useState } from 'react';
import { Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@clerk/clerk-react';
import { downloadManager } from '@/utils/downloadManager';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Song = Tables<'songs'>;

interface DownloadButtonProps {
  song: Song;
  className?: string;
}

export function DownloadButton({ song, className }: DownloadButtonProps) {
  const { session } = useSession();
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (!session || downloadStatus === 'downloading') return;

    setDownloadStatus('downloading');
    setProgress(0);

    // Listen to download progress
    const removeListener = downloadManager.addListener((downloads) => {
      const download = downloads.get(song.id);
      if (download) {
        setProgress(download.progress);
        if (download.status === 'completed') {
          setDownloadStatus('completed');
          setTimeout(() => setDownloadStatus('idle'), 3000);
        } else if (download.status === 'error') {
          setDownloadStatus('error');
          setTimeout(() => setDownloadStatus('idle'), 3000);
        }
      }
    });

    const success = await downloadManager.downloadSong(song, session);
    
    if (!success && downloadStatus === 'downloading') {
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }

    // Clean up listener after a delay
    setTimeout(() => removeListener(), 5000);
  };

  const getIcon = () => {
    switch (downloadStatus) {
      case 'downloading':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getVariant = () => {
    switch (downloadStatus) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'ghost';
    }
  };

  return (
    <Button
      variant={getVariant()}
      size="icon"
      onClick={handleDownload}
      disabled={downloadStatus === 'downloading'}
      className={cn(
        "transition-all duration-200",
        downloadStatus === 'completed' && "text-green-600 hover:text-green-700",
        downloadStatus === 'error' && "text-red-600 hover:text-red-700",
        className
      )}
      title={
        downloadStatus === 'downloading' 
          ? `Downloading... ${progress}%`
          : downloadStatus === 'completed'
          ? 'Downloaded successfully'
          : downloadStatus === 'error'
          ? 'Download failed'
          : 'Download song'
      }
    >
      {getIcon()}
    </Button>
  );
}
