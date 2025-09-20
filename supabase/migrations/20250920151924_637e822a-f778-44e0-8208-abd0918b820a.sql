-- Fix user_id column types from UUID to TEXT to match Clerk user IDs
ALTER TABLE playlists ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_liked_songs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE songs ALTER COLUMN user_id TYPE TEXT;