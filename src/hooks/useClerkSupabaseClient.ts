import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

let _singletonSupabaseClient: SupabaseClient<Database> | null = null;
let currentGetToken: (() => Promise<string | null>) | null = null;

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
              const clerkToken = await getTokenFn(); // This will call our `currentGetToken`

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
  const { session, isLoaded, getToken } = useSession();
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false);

  // Effect to update the global currentGetToken reference
  useEffect(() => {
    console.log("[useClerkSupabaseClient useEffect]: Clerk session state changed. isLoaded:", isLoaded, "session:", session ? 'present' : 'null');

    // Define the async function that gets the token
    const tokenFetcher = async () => {
      if (session && isLoaded && getToken) {
        try {
          const token = await getToken({ template: 'supabase' });
          console.log(`[useClerkSupabaseClient]: getToken called. Token length: ${token ? token.length : 'null'}`);
          return token;
        } catch (error) {
          console.error("[useClerkSupabaseClient]: Error calling Clerk's getToken:", error);
          return null;
        }
      }
      console.log("[useClerkSupabaseClient]: Clerk session not ready or getToken not available. Returning null token.");
      return null;
    };

    // Assign it to the global reference
    currentGetToken = tokenFetcher;

    // We trigger a re-memoization of supabase client if currentGetToken reference changes
    // This is implicitly handled by `supabase = useMemo(() => ... , [currentGetToken])` below
    // which relies on `currentGetToken` being a stable function reference for memoization.
    // However, the function content changes, so if the ref itself doesn't change, the memo might not re-run.
    // To ensure the client fetch interceptor *always* has the latest `getTokenFn`, the `currentGetToken`
    // global variable needs to be directly used by the `getSingletonSupabaseClient` function's closure.
    // The previous setup relies on `currentGetToken` being updated in the global scope,
    // and the memoization of `supabase` being triggered by `currentGetToken` itself being a dependency.
    // Let's refine the `useMemo` dependency for `supabase` client.
  }, [session, isLoaded, getToken]); // Depend on session, isLoaded, and getToken

  // Memoize the supabase client instance
  // We use a ref to hold the client to ensure it's truly a singleton across renders
  // and the effect updating `currentGetToken` can influence future fetches.
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  if (!supabaseRef.current && currentGetToken) {
    console.log("[useClerkSupabaseClient]: Creating or re-using singleton client via getSingletonSupabaseClient.");
    supabaseRef.current = getSingletonSupabaseClient(async () => {
      // This wrapper ensures the latest currentGetToken is always called
      // even if the function reference changes after initial client creation.
      return currentGetToken ? currentGetToken() : null;
    });
  }

  const supabase = supabaseRef.current;


  // Effect to manage the readiness state
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

  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
