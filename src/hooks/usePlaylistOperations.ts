
import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';

export function usePlaylistOperations() {
  const { user } = useUser();
  const { supabase } = useClerkSupabase();
  const queryClient = useQueryClient();

  const createPlaylist = useCallback(async (name: string, description?: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlists').insert({
      user_id: user.id,
      name,
      description: description || null
    });
    if (error) {
      console.error('Error creating playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlists', user.id] });
    }
  }, [user, supabase, queryClient]);

  const addSongToPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlist_songs').insert({
      playlist_id: playlistId,
      song_id: songId
    });
    if (error) {
      console.error('Error adding song to playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistId] });
    }
  }, [user, supabase, queryClient]);

  const removeSongFromPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlist_songs')
      .delete()
      .match({ playlist_id: playlistId, song_id: songId });
    if (error) {
      console.error('Error removing song from playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistId] });
    }
  }, [user, supabase, queryClient]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    if (error) {
      console.error('Error deleting playlist:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlists', user.id] });
    }
  }, [user, supabase, queryClient]);

  const toggleLikeSong = useCallback(async (songId: string, videoId: string, likedSongIds: Set<string>) => {
    if (!user || !songId || !supabase) return;
    
    const isLiked = likedSongIds.has(songId);
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_liked_songs')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', songId);
        
        if (error) throw error;
        
        return { action: 'remove', songId };
      } else {
        const { error } = await supabase
          .from('user_liked_songs')
          .insert({
            user_id: user.id,
            song_id: songId,
            liked_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        return { action: 'add', songId };
      }
    } catch (error) {
      console.error('Error in toggleLikeSong:', error);
      return null;
    }
  }, [user, supabase]);

  return {
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
    toggleLikeSong
  };
}
