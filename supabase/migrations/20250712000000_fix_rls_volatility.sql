-- Drop the overly broad "manage" policies
DROP POLICY "Users can manage their own playlists" ON public.playlists;
DROP POLICY "Users can manage playlist songs for their playlists" ON public.playlist_songs;
DROP POLICY "Users can manage their own liked songs" ON public.user_liked_songs;

-- Recreate a broad read policy for playlists (if not already sufficient)
-- The existing "Users can read all playlists" should be enough, but we'll ensure it's there.
-- Let's just create the modification policies.

-- Recreate modification policies for playlists
CREATE POLICY "Users can insert their own playlists" ON public.playlists
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update/delete their own playlists" ON public.playlists
    FOR UPDATE, DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Recreate modification policies for playlist_songs
CREATE POLICY "Users can manage songs for their own playlists" ON public.playlist_songs
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = playlist_songs.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

-- Recreate policies for user_liked_songs
-- This table needs a SELECT policy and modification policies
CREATE POLICY "Users can view their own liked songs" ON public.user_liked_songs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/delete their own liked songs" ON public.user_liked_songs
    FOR INSERT, DELETE TO authenticated
    WITH CHECK (auth.uid() = user_id);
