import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

// Initialize the Supabase client ONCE.
// The fetch interceptor here needs to be carefully constructed.
let _singletonSupabaseClient: SupabaseClient<Database> | null = null;

// This will be a holder for Clerk's getToken function, which will be updated by the hook.
let currentGetToken: (() => Promise<string | null>) | null = null;

// We create the client once, with a fetch interceptor that uses the latest getToken function.
function getSingletonSupabaseClient(getTokenFn: (() => Promise<string | null>)) {
  if (!_singletonSupabaseClient) {
    _singletonSupabaseClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          fetch: async (url, options: RequestInit = {}) => {
            try {
              // Dynamically get the latest token using the provided getTokenFn
              const clerkToken = await getTokenFn(); // Use the latest token provider

              const headers = new Headers(options.headers || {});
              if (clerkToken) {
                headers.set('Authorization', `Bearer ${clerkToken}`);
              } else {
                // If no token, ensure Authorization header is absent or cleared for anon access
                headers.delete('Authorization');
              }

              return fetch(url, {
                ...options,
                headers,
              });
            } catch (error) {
              console.error('Error in Supabase fetch interceptor:', error);
              // Fallback to regular fetch without token on error, or rethrow if critical
              return fetch(url, options);
            }
          },
        },
      }
    );
  }
  return _singletonSupabaseClient;
}


export function useClerkSupabaseClient(): {
  supabase: SupabaseClient<Database> | null;
  isSupabaseAuthReady: boolean;
} {
  const { session, isLoaded, getToken } = useSession(); // Get Clerk's session info and getToken
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false);

  // Update the global getToken function reference whenever Clerk's session/getToken changes.
  // This ensures the fetch interceptor (defined once) always has the latest getToken function.
  useEffect(() => {
    currentGetToken = async () => {
      if (session) {
        return getToken({ template: 'supabase' });
      }
      return null;
    };
  }, [session, getToken]); // Depend on session and getToken to keep currentGetToken updated

  // Memoize the supabase client, ensuring it's only created once with the initial getToken setup.
  // The client itself is a singleton.
  const supabase = useMemo(() => {
    // Only proceed if currentGetToken is available (meaning useEffect has run at least once)
    if (currentGetToken) {
      return getSingletonSupabaseClient(currentGetToken);
    }
    return null;
  }, [currentGetToken]); // Depend on currentGetToken to trigger client creation if it becomes available

  // Use an effect to manage the readiness state based on Clerk's session loading
  useEffect(() => {
    // We are considered "ready" when Clerk session is loaded and our Supabase client instance exists.
    // The actual token syncing happens within the fetch interceptor dynamically.
    if (isLoaded && supabase) {
      setIsSupabaseAuthReady(true);
    } else {
      setIsSupabaseAuthReady(false);
    }
  }, [isLoaded, supabase]);

  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
