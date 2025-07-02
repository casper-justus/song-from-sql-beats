
import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

// Create a single authenticated Supabase client instance
let authenticatedClient: SupabaseClient<Database> | null = null;

export function useClerkSupabaseClient(): SupabaseClient<Database> | null {
  const { session, isLoaded } = useSession();
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    if (isLoaded && session) {
      // Only create a new client if we don't have one or the session changed
      if (!authenticatedClient) {
        authenticatedClient = createClient<Database>(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          {
            global: {
              fetch: async (url, options: RequestInit = {}) => {
                try {
                  // Get the Clerk JWT token from the session
                  const clerkToken = await session.getToken({
                    template: 'supabase', // This must match your Clerk JWT template name
                  });

                  // Add the Clerk token to the Authorization header
                  const headers = new Headers(options.headers || {});
                  if (clerkToken) {
                    headers.set('Authorization', `Bearer ${clerkToken}`);
                  }

                  // Make the fetch request with the updated headers
                  return fetch(url, {
                    ...options,
                    headers,
                  });
                } catch (error) {
                  console.error('Error getting Clerk token:', error);
                  // Fallback to regular fetch without token
                  return fetch(url, options);
                }
              },
            },
          }
        );
      }
      setSupabase(authenticatedClient);
    } else if (isLoaded && !session) {
      // If Clerk is loaded but no session, reset the client
      authenticatedClient = null;
      setSupabase(null);
    }
  }, [session, isLoaded]);

  return supabase;
}
