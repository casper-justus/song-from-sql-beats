import React, { useEffect } from 'react'; // Removed useState
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { useClerkSupabase } from '@/contexts/ClerkSupabaseContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Tables } from '@/integrations/supabase/types';
import ResolvedCoverImage from '@/components/ResolvedCoverImage';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Play, ListPlus, Trash2, MoreVertical, SkipForward, Pause, Shuffle } from 'lucide-react';

type Song = Tables<'songs'>;
type Playlist = Tables<'playlists'>;
type PlaylistSongEntry = Tables<'playlist_songs'> & { songs: Song | null };

interface PlaylistPageData {
  playlistDetails: Playlist | null;
  playlistSongs: PlaylistSongEntry[];
}

const PlaylistDetailPage = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user } = useUser();
  const { supabase } = useClerkSupabase();
  const {
    profile, // <-- Get profile
    setQueue,
    toggleShuffle,
    currentSong,
    isPlaying,
    addToQueue,
    playNextInQueue,
    removeSongFromPlaylist: removeSongFromPlaylistContext,
    playlists, // <-- Get playlists for the sub-menu
    addSongToPlaylist // <-- Get the action
  } = useMusicPlayer();

  const { data, isLoading, error } = useQuery<PlaylistPageData>({
    queryKey: ['playlistPageData', playlistId, profile?.id], // Depend on profile
    queryFn: async () => {
      if (!playlistId || !profile || !supabase) { // Check for profile
        return { playlistDetails: null, playlistSongs: [] };
      }

      const [playlistDetailsResult, playlistSongsResult] = await Promise.all([
        supabase
          .from('playlists')
          .select('*')
          .eq('id', playlistId)
          .eq('user_id', profile.id) // <-- Use profile.id (uuid)
          .single(),
        supabase
          .from('playlist_songs')
          .select(`
            *,
            songs (*)
          `)
          .eq('playlist_id', playlistId)
          .order('song_order', { ascending: true })
      ]);

      const { data: playlistData, error: playlistError } = playlistDetailsResult;
      if (playlistError || !playlistData) {
        // Log the error but allow the component to handle the null playlistDetails
        console.error('Error fetching playlist details:', playlistError?.message);
        // Depending on requirements, you might throw new Error('Playlist not found or access denied.');
        // For now, returning null allows the component to render a "not found" state.
      }

      const { data: songsData, error: songsError } = playlistSongsResult;
      if (songsError) {
        console.error('Error fetching songs for playlist:', songsError);
        // Rethrow or handle as appropriate. For now, let's return empty songs on error.
        // throw songsError; // Or handle more gracefully
        return { playlistDetails: playlistData || null, playlistSongs: [] };
      }

      const filteredSongs = (songsData || []).filter(item => item.songs !== null) as PlaylistSongEntry[];

      return { playlistDetails: playlistData || null, playlistSongs: filteredSongs };
    },
    enabled: !!playlistId && !!user && !!supabase,
  });

  // Extract playlistDetails and playlistSongs from the combined data object
  const playlistDetails = data?.playlistDetails;
  const playlistSongs = data?.playlistSongs || [];


  const handlePlayPlaylist = () => {
    const songsInPlaylist = playlistSongs.map(ps => ps.songs).filter(Boolean) as Song[];
    if (songsInPlaylist.length > 0) {
      setQueue(songsInPlaylist, 0);
    }
  };

  const handleShufflePlay = () => {
    const songsInPlaylist = playlistSongs.map(ps => ps.songs).filter(Boolean) as Song[];
    if (songsInPlaylist.length > 0) {
      setQueue(songsInPlaylist, 0);
      toggleShuffle();
    }
  };

  const handlePlaySong = (song: Song) => {
    const songsInPlaylist = playlistSongs.map(ps => ps.songs).filter(Boolean) as Song[];
    const songIndex = songsInPlaylist.findIndex(s => s.id === song.id);
    if (songIndex !== -1) {
      setQueue(songsInPlaylist, songIndex);
    }
  };

  const handleRemoveSongFromPlaylist = async (songId: string) => {
    if (!playlistId || !user) return;
    // We'll use the context function if it's suitable, or implement directly
    // For now, let's assume a direct call or that the context function can handle it
    // by re-querying or updating cache.
    await removeSongFromPlaylistContext(playlistId, songId);
     // todo: re-fetch or update cache for playlistSongs query
  };


  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto my-8"></div>
        Loading playlist...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-400 text-center">
        Error loading playlist: {error.message}
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/library"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!playlistDetails) {
     return (
      <div className="container mx-auto p-4 text-white text-center">
        Playlist not found or you don't have access.
         <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/library"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const songsToDisplay = playlistSongs.map(ps => ps.songs).filter(Boolean) as Song[];

  return (
    <div className="min-h-screen charcoal-bg wave-bg pb-20 pt-10 sm:pt-16">
      <div className="container mx-auto p-4 text-white">
        <div className="mb-8 relative">
          <Button asChild variant="ghost" className="absolute top-0 left-0 text-gray-300 hover:text-yellow-400">
            <Link to="/library"><ArrowLeft className="w-5 h-5 mr-2" /> Back</Link>
          </Button>
          <div className="pt-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{playlistDetails.name}</h1>
            {playlistDetails.description && (
              <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">{playlistDetails.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{songsToDisplay.length} songs</p>
          </div>
        </div>

        {songsToDisplay.length > 0 ? (
          <>
            <div className="mb-6 text-center flex items-center justify-center gap-4">
              <Button onClick={handlePlayPlaylist} size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Play className="w-5 h-5 mr-2" /> Play All
              </Button>
              <Button onClick={handleShufflePlay} size="lg" variant="outline" className="text-white hover:bg-white/10 hover:text-yellow-400">
                <Shuffle className="w-5 h-5 mr-2" /> Shuffle All
              </Button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {songsToDisplay.map((song, index) => (
                <div
                  key={song.id}
                  className={`p-2 sm:p-3 rounded-lg transition-all duration-200 hover:bg-white/10 group flex items-center gap-3 sm:gap-4 ${
                    currentSong?.id === song.id ? 'bg-white/20 border border-yellow-500/50' : 'bg-gray-800/40 border border-transparent'
                  }`}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden flex-shrink-0 bg-gray-700">
                    <ResolvedCoverImage
                      imageKey={song.cover_url}
                      videoId={song.video_id}
                      altText={song.title || 'Song cover'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate text-sm sm:text-base ${
                      currentSong?.id === song.id ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {index + 1}. {song.title || "Unknown Title"}
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm truncate">
                      {song.artist} {song.album ? `• ${song.album}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlaySong(song)} // This sets the queue to the playlist, starting here
                      className="text-gray-300 hover:text-yellow-400 w-8 h-8 sm:w-9 sm:h-9"
                      title={currentSong?.id === song.id && isPlaying ? "Pause current track" : "Play (start playlist here)"}
                    >
                      {currentSong?.id === song.id && isPlaying ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-300 hover:text-yellow-400 w-8 h-8 sm:w-9 sm:h-9"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        onClick={(e) => e.stopPropagation()} // Prevent row click when menu is open
                        className="bg-gray-800 border-gray-700 text-white"
                      >
                        <DropdownMenuItem
                          onClick={() => playNextInQueue(song)}
                          className="hover:bg-gray-700 cursor-pointer"
                        >
                          <SkipForward className="w-4 h-4 mr-2" /> Play Next
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addToQueue(song)}
                          className="hover:bg-gray-700 cursor-pointer"
                        >
                          <ListPlus className="w-4 h-4 mr-2" /> Add to Queue
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="hover:bg-gray-700 cursor-pointer">
                            <ListPlus className="w-4 h-4 mr-2" />
                            Add to Playlist
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-gray-800 border-gray-700 text-white">
                            {playlists.map(playlist => (
                              <DropdownMenuItem
                                key={playlist.id}
                                onClick={() => addSongToPlaylist(playlist.id, song.id)}
                                className="hover:bg-gray-700 cursor-pointer"
                              >
                                {playlist.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          onClick={() => handleRemoveSongFromPlaylist(song.id)}
                          className="text-red-500 hover:bg-red-700/50 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remove from Playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 py-10">This playlist is empty.</p>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetailPage;
