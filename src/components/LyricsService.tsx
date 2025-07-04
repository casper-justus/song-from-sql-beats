
import React, { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';

interface SyncedLyric {
  time: number;
  text: string;
}

interface LyricsServiceProps {
  title: string;
  artist: string;
  currentTime: number;
  onLyricsFound: (lyrics: SyncedLyric[]) => void;
}

export function LyricsService({ title, artist, currentTime, onLyricsFound }: LyricsServiceProps) {
  const { session } = useSession();
  const [lyrics, setLyrics] = useState<SyncedLyric[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSyncedLyrics = async () => {
      if (!title || !artist || !session) return;

      setIsLoading(true);
      
      try {
        // Create a search query
        const searchQuery = `${artist} ${title}`.replace(/[^\w\s]/gi, '').trim();
        
        // Call our edge function to get synced lyrics
        const token = await session.getToken({ template: 'supabase' });
        
        const response = await fetch('/api/lyrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            artist: artist.trim(),
            title: title.trim(),
            searchQuery
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.lyrics && Array.isArray(data.lyrics)) {
            setLyrics(data.lyrics);
            onLyricsFound(data.lyrics);
          }
        }
      } catch (error) {
        console.error('Error fetching synced lyrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSyncedLyrics();
  }, [title, artist, session, onLyricsFound]);

  // This component doesn't render anything, it's just a service
  return null;
}

export function getCurrentLyricIndex(lyrics: SyncedLyric[], currentTime: number): number {
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      return i;
    }
  }
  return -1;
}
