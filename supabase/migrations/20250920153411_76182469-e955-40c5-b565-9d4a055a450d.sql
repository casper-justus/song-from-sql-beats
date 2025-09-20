-- Drop all policies that might reference the user_id columns we're changing
DROP POLICY IF EXISTS "Users can add songs to their own playlists" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users can remove songs from their own playlists" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users can update songs in their own playlists" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users can view songs in their own playlists" ON public.playlist_songs;

DROP POLICY IF EXISTS "Allow authenticated users to view their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Allow authenticated users to create their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Allow authenticated users to update their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own playlists" ON public.playlists;

DROP POLICY IF EXISTS "Users can view their own liked songs" ON public.user_liked_songs;
DROP POLICY IF EXISTS "Users can create their own liked songs" ON public.user_liked_songs;
DROP POLICY IF EXISTS "Users can delete their own liked songs" ON public.user_liked_songs;

DROP POLICY IF EXISTS "Users can create songs" ON public.songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON public.songs;

-- Alter the columns from UUID to TEXT
ALTER TABLE public.playlists ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_liked_songs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.songs ALTER COLUMN user_id TYPE TEXT;

-- Recreate all the policies
-- Playlists policies
CREATE POLICY "Allow authenticated users to view their own playlists" 
ON public.playlists 
FOR SELECT 
USING (user_id = requesting_user_id());

CREATE POLICY "Allow authenticated users to create their own playlists" 
ON public.playlists 
FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Allow authenticated users to update their own playlists" 
ON public.playlists 
FOR UPDATE 
USING (user_id = requesting_user_id());

CREATE POLICY "Allow authenticated users to delete their own playlists" 
ON public.playlists 
FOR DELETE 
USING (user_id = requesting_user_id());

-- User liked songs policies
CREATE POLICY "Users can view their own liked songs" 
ON public.user_liked_songs 
FOR SELECT 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can create their own liked songs" 
ON public.user_liked_songs 
FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own liked songs" 
ON public.user_liked_songs 
FOR DELETE 
USING (user_id = requesting_user_id());

-- Songs policies
CREATE POLICY "Users can create songs" 
ON public.songs 
FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own songs" 
ON public.songs 
FOR UPDATE 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own songs" 
ON public.songs 
FOR DELETE 
USING (user_id = requesting_user_id());

-- Playlist songs policies
CREATE POLICY "Users can add songs to their own playlists" 
ON public.playlist_songs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM playlists p 
  WHERE p.id = playlist_songs.playlist_id 
  AND p.user_id = requesting_user_id()
));

CREATE POLICY "Users can remove songs from their own playlists" 
ON public.playlist_songs 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM playlists p 
  WHERE p.id = playlist_songs.playlist_id 
  AND p.user_id = requesting_user_id()
));

CREATE POLICY "Users can update songs in their own playlists" 
ON public.playlist_songs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM playlists p 
  WHERE p.id = playlist_songs.playlist_id 
  AND p.user_id = requesting_user_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM playlists p 
  WHERE p.id = playlist_songs.playlist_id 
  AND p.user_id = requesting_user_id()
));

CREATE POLICY "Users can view songs in their own playlists" 
ON public.playlist_songs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM playlists p 
  WHERE p.id = playlist_songs.playlist_id 
  AND p.user_id = requesting_user_id()
));