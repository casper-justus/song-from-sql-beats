import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

// Public Supabase URL and Anon Key
const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

/**
 * A hook that provides a Supabase client authenticated with a Clerk session.
 *
 * This hook manages a Supabase client instance that is automatically configured
 * to use the Clerk JWT for authentication. The client is memoized and will only
 * be recreated if the Clerk session changes.
 *
 * @returns An object containing the Supabase client instance and a boolean
 *          `isSupabaseAuthReady` which is true when the client is initialized
 *          and authenticated.
 */
export function useClerkSupabaseClient(): { supabase: SupabaseClient<Database> | null; isSupabaseAuthReady: boolean; } {
  const { session, isLoaded } = useSession();

  // Memoize the Supabase client instance.
  // It will be re-created only when the Clerk session object changes.
  const supabase = useMemo(() => {
    // We can't initialize the client until the session is loaded and exists.
    if (isLoaded && session) {
      console.log("[useClerkSupabaseClient]: Clerk session loaded. Creating new Supabase client.");

      const supabaseClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            // The fetch interceptor injects the Clerk token into every Supabase request.
            fetch: async (url, options: RequestInit = {}) => {
              console.log(`[Supabase Fetch Interceptor]: Intercepting request to ${url}`);
              try {
                // `getToken` is now directly from the session in this closure.
                const token = await session.getToken({ template: 'supabase' });

                if (!token) {
                  console.warn("[Supabase Fetch Interceptor]: Clerk token is null. Request will be anonymous.");
                  return fetch(url, options);
                }

                const headers = new Headers(options.headers || {});
                headers.set('Authorization', `Bearer ${token}`);
                console.log("[Supabase Fetch Interceptor]: Authorization header set.");

                return fetch(url, { ...options, headers });
              } catch (error) {
                console.error('[Supabase Fetch Interceptor]: Error getting Clerk token:', error);
                // Proceed with the request without the auth header if token fetching fails.
                return fetch(url, options);
              }
            },
          },
        }
      );
      return supabaseClient;
    }

    // Return null if the session isn't ready.
    console.log("[useClerkSupabaseClient]: Clerk session not ready. Supabase client is null.");
    return null;
  }, [session, isLoaded]); // Dependencies for useMemo

  // The readiness state is now simply whether the supabase client has been created.
  const isSupabaseAuthReady = !!supabase;

  useEffect(() => {
    if (isSupabaseAuthReady) {
      console.log("[useClerkSupabaseClient]: Supabase client is ready.");
    } else {
      console.log("[useClerkSupabaseClient]: Supabase client is not yet ready.");
    }
  }, [isSupabaseAuthReady]);

  return { supabase, isSupabaseAuthReady };
}
