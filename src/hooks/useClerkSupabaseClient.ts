import React, { useState, useEffect, useMemo, useRef } from 'react'; // <--- Add useRef here
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
  const { session, isLoaded, getToken } = useSession();
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false);

  useEffect(() => {
    console.log("[useClerkSupabaseClient useEffect]: Clerk session state changed. isLoaded:", isLoaded, "session:", session ? 'present' : 'null');

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

    currentGetToken = tokenFetcher;
  }, [session, isLoaded, getToken]);

  // Use a ref to hold the client to ensure it's truly a singleton across renders
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  // Initialize the client only once, and ensure it uses the latest currentGetToken.
  // This block runs on every render, but `getSingletonSupabaseClient` itself ensures
  // `_singletonSupabaseClient` is initialized only once.
  // The `async () => { return currentGetToken ? currentGetToken() : null; }` ensures
  // the interceptor closure always calls the *latest* `currentGetToken`.
  if (!supabaseRef.current) { // Only attempt to get/set the client if it hasn't been set yet in the ref
    console.log("[useClerkSupabaseClient]: Attempting to get/set singleton client.");
    supabaseRef.current = getSingletonSupabaseClient(async () => {
      return currentGetToken ? currentGetToken() : null;
    });
  }

  const supabase = supabaseRef.current;

  useEffect(() => {
    console.log("[useClerkSupabaseClient Readiness]: isLoaded:", isLoaded, "supabase available:", !!supabase);
    if (isLoaded && supabase) {
      setIsSupabaseAuthReady(true);
      console.log("[useClerkSupabaseClient Readiness]: Supabase client and auth ready!");
    } else {
      setIsSupabaseAuthReady(false);
      console.log("[useClerkSupabaseClient Readiness]: Supabase client or auth not yet ready.");
    }
  }, [isLoaded, supabase]);

  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
