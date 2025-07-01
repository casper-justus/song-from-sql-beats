
import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

export function useClerkSupabaseClient(): SupabaseClient<Database> | null {
  const { user, isLoaded } = useUser();
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      // Create a Supabase client that uses Clerk's JWT token
      const client = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            fetch: async (url, options = {}) => {
              try {
                // Get the Clerk JWT token
                const clerkToken = await user.getToken({
                  template: 'supabase', // This must match your Clerk JWT template name
                });

                // Add the Clerk token to the Authorization header
                const headers = new Headers(options.headers);
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
      setSupabase(client);
    } else if (isLoaded && !user) {
      // If Clerk is loaded but no user, set supabase client to null
      setSupabase(null);
    }
  }, [user, isLoaded]);

  return supabase;
}
