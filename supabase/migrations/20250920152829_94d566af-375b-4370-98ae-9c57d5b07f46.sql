-- Drop existing policies that reference the old UUID columns
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

-- Recreate the policies for playlists
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

-- Recreate the policies for user_liked_songs
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

-- Recreate the policies for songs
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