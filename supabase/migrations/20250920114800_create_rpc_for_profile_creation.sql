-- This function handles creating a Supabase auth user and a public profile
-- for a user who has authenticated with Clerk. It's designed to be called
-- from the client-side application via RPC.

CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
    clerk_id TEXT,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT
)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial to allow inserting into auth.users
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    -- 1. Check if a user with this Clerk ID already exists in auth.users
    -- We assume the Clerk ID is stored in raw_user_meta_data, which the original trigger uses.
    SELECT u.id INTO user_uuid
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'clerk_id' = clerk_id;

    -- 2. If the user doesn't exist, create them in auth.users
    IF user_uuid IS NULL THEN
        INSERT INTO auth.users (instance_id, aud, role, email, raw_user_meta_data)
        VALUES (
            current_setting('app.instance_id')::uuid,
            'authenticated',
            'authenticated',
            'user-' || clerk_id || '@example.com', -- Create a dummy email
            jsonb_build_object(
                'clerk_id', clerk_id,
                'provider', 'clerk',
                'full_name', ensure_profile_exists.full_name,
                'username', ensure_profile_exists.username,
                'avatar_url', ensure_profile_exists.avatar_url
            )
        ) RETURNING id INTO user_uuid;
        -- The existing `on_auth_user_created` trigger will now fire and create the profile
        -- using the metadata we just provided.
    END IF;

    -- 3. Return the complete profile from the public.profiles table
    -- This will either be the one we just created or the one that already existed.
    RETURN QUERY
    SELECT p.id, p.full_name, p.username, p.avatar_url
    FROM public.profiles p
    WHERE p.id = user_uuid;
END;
$$;
