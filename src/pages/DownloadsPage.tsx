import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';
import { Trash2, Play } from 'lucide-react';
import { deleteDownloadedSong, isSongDownloaded } from '@/utils/offlinePlayback';
import { Link } from 'react-router-dom';

const DownloadsPage = () => {
  const { playFromQueue, setQueue } = useMusicPlayer();
  const [downloadedSongs, setDownloadedSongs] = useState<any[]>([]);

  useEffect(() => {
    const fetchDownloadedSongs = async () => {
      const songs = JSON.parse(localStorage.getItem('downloadedSongsList') || '[]');
      const songsWithStatus = await Promise.all(
        songs.map(async (song: any) => {
          const localPath = await isSongDownloaded(song.songId);
          return { ...song, localPath };
        })
      );
      setDownloadedSongs(songsWithStatus.filter(song => song.localPath));
    };

    fetchDownloadedSongs();
  }, []);

  const handlePlaySong = (song: any) => {
    const songToPlay = {
      id: song.songId,
      title: song.title,
      artist: song.artist,
      cover_url: '',
      video_id: '',
      storage_path: song.localPath,
      file_url: song.localPath,
      lyrics_url: '',
      created_at: '',
    };
    setQueue([songToPlay], 0);
  };

  const handleDeleteSong = async (songId: string) => {
    await deleteDownloadedSong(songId);
    setDownloadedSongs(downloadedSongs.filter(song => song.songId !== songId));
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-8">Downloads</h1>
      {downloadedSongs.length === 0 ? (
        <p>No songs have been downloaded yet.</p>
      ) : (
        <div className="space-y-4">
          {downloadedSongs.map(song => (
            <div
              key={song.songId}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
            >
              <div>
                <p className="font-semibold">{song.title}</p>
                <p className="text-sm text-gray-400">{song.artist}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => handlePlaySong(song)}>
                  <Play className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteSong(song.songId)}>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DownloadsPage;
