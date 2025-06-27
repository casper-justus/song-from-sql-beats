
-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_key TEXT, -- R2 key for playlist cover image
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_songs junction table
CREATE TABLE public.playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);

-- Enable RLS on playlists table
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for playlists
CREATE POLICY "Users can view their own playlists and public playlists" 
ON public.playlists 
FOR SELECT 
USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own playlists" 
ON public.playlists 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own playlists" 
ON public.playlists 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own playlists" 
ON public.playlists 
FOR DELETE 
USING (user_id = auth.uid());

-- Enable RLS on playlist_songs table
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS policies for playlist_songs
CREATE POLICY "Users can view songs in their playlists and public playlists" 
ON public.playlist_songs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_id 
    AND (p.user_id = auth.uid() OR p.is_public = true)
  )
);

CREATE POLICY "Users can add songs to their own playlists" 
ON public.playlist_songs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update songs in their own playlists" 
ON public.playlist_songs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove songs from their own playlists" 
ON public.playlist_songs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_id 
    AND p.user_id = auth.uid()
  )
);

-- Enable RLS on user_liked_songs table
ALTER TABLE public.user_liked_songs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_liked_songs
CREATE POLICY "Users can view their own liked songs" 
ON public.user_liked_songs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can like songs" 
ON public.user_liked_songs 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike songs" 
ON public.user_liked_songs 
FOR DELETE 
USING (user_id = auth.uid());
