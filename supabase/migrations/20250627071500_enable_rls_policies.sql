
-- Enable RLS and create policies for authenticated users to read all data

-- Songs table policies
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all songs" ON public.songs
    FOR SELECT TO authenticated
    USING (true);

-- Playlists table policies  
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all playlists" ON public.playlists
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can manage their own playlists" ON public.playlists
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Playlist songs table policies
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read playlist songs" ON public.playlist_songs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can manage playlist songs for their playlists" ON public.playlist_songs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists 
            WHERE playlists.id = playlist_songs.playlist_id 
            AND playlists.user_id = auth.uid()
        )
    );

-- User liked songs table policies
ALTER TABLE public.user_liked_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own liked songs" ON public.user_liked_songs
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
