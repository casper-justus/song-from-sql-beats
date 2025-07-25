import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext'; // Import your custom context hook

export function usePlaylistOperations() {
  const { user } = useUser();
  // Destructure 'isReady' from your ClerkSupabaseContext
  const { supabase, isReady } = useClerkSupabase();
  const queryClient = useQueryClient();

  // Helper function for readiness check
  const checkReadiness = (operationName: string) => {
    if (!user) {
      console.warn(`[${operationName}]: User not logged in. Skipping operation.`);
      return false;
    }
    if (!supabase) {
      console.warn(`[${operationName}]: Supabase client not initialized. Skipping operation.`);
      return false;
    }
    if (!isReady) {
      console.warn(`[${operationName}]: Supabase authentication sync with Clerk not ready. Skipping operation.`);
      return false;
    }
    return true;
  };

  const createPlaylist = useCallback(async (name: string, description?: string) => {
    if (!checkReadiness('createPlaylist')) {
      return;
    }

    try {
      const { data, error } = await supabase.from('playlists').insert({
        user_id: user!.id, // user is guaranteed by checkReadiness
        name,
        description: description || null
      });

      if (error) {
        console.error('Error creating playlist:', error);
        throw error; // Re-throw to allow component to handle
      } else {
        console.log('Playlist created successfully:', data);
        // Invalidate queries to refetch the list of playlists for the current user
        queryClient.invalidateQueries({ queryKey: ['playlists', user!.id] });
        return data;
      }
    } catch (err) {
      console.error('An unexpected error occurred during createPlaylist:', err);
      // Re-throw if you want the calling component to catch this
      throw err;
    }
  }, [user, supabase, isReady, queryClient]); // Add isReady to dependencies

  const addSongToPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (!checkReadiness('addSongToPlaylist')) {
      return;
    }

    try {
      const { error } = await supabase.from('playlist_songs').insert({
        playlist_id: playlistId,
        song_id: songId
      });

      if (error) {
        console.error('Error adding song to playlist:', error);
        throw error;
      } else {
        console.log(`Song ${songId} added to playlist ${playlistId} successfully.`);
        queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistId] });
      }
    } catch (err) {
      console.error('An unexpected error occurred during addSongToPlaylist:', err);
      throw err;
    }
  }, [user, supabase, isReady, queryClient]); // Add isReady to dependencies

  const removeSongFromPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (!checkReadiness('removeSongFromPlaylist')) {
      return;
    }

    try {
      const { error } = await supabase.from('playlist_songs')
        .delete()
        .match({ playlist_id: playlistId, song_id: songId });

      if (error) {
        console.error('Error removing song from playlist:', error);
        throw error;
      } else {
        console.log(`Song ${songId} removed from playlist ${playlistId} successfully.`);
        queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistId] });
      }
    } catch (err) {
      console.error('An unexpected error occurred during removeSongFromPlaylist:', err);
      throw err;
    }
  }, [user, supabase, isReady, queryClient]); // Add isReady to dependencies

  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!checkReadiness('deletePlaylist')) {
      return;
    }

    try {
      // For delete, you'd typically also have an RLS policy ensuring the user owns the playlist
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);

      if (error) {
        console.error('Error deleting playlist:', error);
        throw error;
      } else {
        console.log(`Playlist ${playlistId} deleted successfully.`);
        queryClient.invalidateQueries({ queryKey: ['playlists', user!.id] }); // Invalidate for the user
      }
    } catch (err) {
      console.error('An unexpected error occurred during deletePlaylist:', err);
      throw err;
    }
  }, [user, supabase, isReady, queryClient]); // Add isReady to dependencies

  const toggleLikeSong = useCallback(async (songId: string, videoId: string, likedSongIds: Set<string>) => {
    if (!checkReadiness('toggleLikeSong')) {
      return null; // Return null or throw as appropriate for this operation
    }

    const isLiked = likedSongIds.has(songId);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_liked_songs')
          .delete()
          .eq('user_id', user!.id)
          .eq('song_id', songId); // songId is already a parameter

        if (error) throw error;

        console.log(`Song ${songId} unliked successfully.`);
        queryClient.invalidateQueries({ queryKey: ['userLikedSongs', user!.id] }); // Invalidate for the user
        return { action: 'remove', songId };
      } else {
        const { error } = await supabase
          .from('user_liked_songs')
          .insert({
            user_id: user!.id,
            song_id: songId, // songId is already a parameter
            liked_at: new Date().toISOString()
          });

        if (error) throw error;

        console.log(`Song ${songId} liked successfully.`);
        queryClient.invalidateQueries({ queryKey: ['userLikedSongs', user!.id] }); // Invalidate for the user
        return { action: 'add', songId };
      }
    } catch (error) {
      console.error('Error in toggleLikeSong:', error);
      throw error; // Propagate error
    }
  }, [user, supabase, isReady, queryClient, likedSongIds]); // Removed songId from dependencies

  return {
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
    toggleLikeSong
  };
}
