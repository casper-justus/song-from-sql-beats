import { useState, useEffect, useMemo, useRef } from 'react'; // Corrected import
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

let _singletonSupabaseClient: SupabaseClient<Database> | null = null;
let currentGetToken: (() => Promise<string | null>) | null = null; // Global mutable reference

function getSingletonSupabaseClient(getTokenFn: (() => Promise<string | null>)) {
  if (!_singletonSupabaseClient) {
    console.log("[Supabase Client]: Initializing new Supabase client instance.");
    _singletonSupabaseClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          fetch: async (url, options: RequestInit = {}) => {
            console.log(`[Supabase Fetch Interceptor]: Intercepting request to ${url}`);
            try {
              // This calls the *currently assigned* getTokenFn (which comes from currentGetToken)
              const clerkToken = await getTokenFn();

              const headers = new Headers(options.headers || {});
              if (clerkToken) {
                headers.set('Authorization', `Bearer ${clerkToken}`);
                console.log("[Supabase Fetch Interceptor]: Authorization header set with token.");
              } else {
                headers.delete('Authorization');
                console.log("[Supabase Fetch Interceptor]: No Clerk token available, Authorization header NOT set.");
              }

              return fetch(url, {
                ...options,
                headers,
              });
            } catch (error) {
              console.error('[Supabase Fetch Interceptor]: Error in fetch interceptor:', error);
              return fetch(url, options);
            }
          },
        },
      }
    );
  }
  return _singletonSupabaseClient;
}

export function useClerkSupabaseClient(): { supabase: SupabaseClient<Database> | null; isSupabaseAuthReady: boolean; } {
  const { session, isLoaded } = useSession();
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false);

  // Effect to update the global `currentGetToken` reference whenever Clerk session state changes.
  // This ensures the `fetch` interceptor always calls the latest `getToken` function from Clerk.
  useEffect(() => {
    console.log("[useClerkSupabaseClient useEffect]: Clerk session state changed. isLoaded:", isLoaded, "session:", session ? 'present' : 'null');

    const tokenFetcher = async () => {
      // Ensure session, isLoaded are available from Clerk before attempting to get a token.
      if (session && isLoaded) {
        try {
          const token = await session.getToken({ template: 'supabase' });
          console.log(`[useClerkSupabaseClient]: getToken called. Token length: ${token ? token.length : 'null'}`);
          return token;
        } catch (error) {
          console.error("[useClerkSupabaseClient]: Error calling Clerk's getToken:", error);
          return null;
        }
      }
      console.log("[useClerkSupabaseClient]: Clerk session not ready. Returning null token.");
      return null;
    };

    currentGetToken = tokenFetcher; // Update the global reference
  }, [session, isLoaded]); // Dependencies for this effect

  // Use a ref to store the singleton Supabase client instance.
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  // Initialize the singleton client only once.
  // The `getSingletonSupabaseClient` function itself handles the "only once" logic.
  // The `async () => { return currentGetToken ? currentGetToken() : null; }` wrapper ensures
  // the client's `fetch` interceptor always calls the *latest* `currentGetToken` from the global scope.
  if (!supabaseRef.current && currentGetToken) { // Only attempt if ref is null AND currentGetToken is set
    console.log("[useClerkSupabaseClient]: Creating or re-using singleton client via getSingletonSupabaseClient.");
    supabaseRef.current = getSingletonSupabaseClient(async () => {
      return currentGetToken ? currentGetToken() : null;
    });
  }
  const supabase = supabaseRef.current; // Get the current client from the ref

  // Effect to manage the `isSupabaseAuthReady` state.
  // It becomes true when Clerk's session is loaded AND the Supabase client instance exists.
  useEffect(() => {
    console.log("[useClerkSupabaseClient Readiness]: isLoaded:", isLoaded, "supabase available:", !!supabase);
    if (isLoaded && supabase) {
      setIsSupabaseAuthReady(true);
      console.log("[useClerkSupabaseClient Readiness]: Supabase client and auth ready!");
    } else {
      setIsSupabaseAuthReady(false);
      console.log("[useClerkSupabaseClient Readiness]: Supabase client or auth not yet ready.");
    }
  }, [isLoaded, supabase]); // Depend on Clerk's loading state and the Supabase client instance

  // Memoize the return value to prevent unnecessary re-renders of consuming components.
  return useMemo(() => ({ supabase, isSupabaseAuthReady }), [supabase, isSupabaseAuthReady]);
}
