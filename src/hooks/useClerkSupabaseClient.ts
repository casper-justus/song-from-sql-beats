import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types'; // Adjust this path if your Database type is elsewhere

// --- Supabase Configuration (replace with your actual values) ---
// It's generally recommended to use environment variables for these in a real project.
// Example: process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY
const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

// --- Singleton Supabase Client Instance ---
// This ensures createClient is called ONLY ONCE when this module is loaded.
// This is the key fix for the "Multiple GoTrueClient instances detected" warning.
const supabaseClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// You might want to add a check here for missing env variables if you switch to them
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase URL or Anon Key is not defined. Please check your configuration.");
}

/**
 * Custom hook to provide a singleton Supabase client and manage its authentication
 * state synchronization with Clerk.
 * @returns An object containing the SupabaseClient instance and a boolean indicating if auth sync is ready.
 */
export function useClerkSupabaseClient(): {
  supabase: SupabaseClient<Database> | null;
  isSupabaseAuthReady: boolean;
} {
  const { session, isLoaded } = useSession(); // Clerk's session state
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false); // Tracks if Supabase auth is synced

  // Use the pre-initialized singleton client instance
  const supabase = supabaseClientInstance;

  // Effect to synchronize Clerk's session with Supabase's auth state
  useEffect(() => {
    // If Clerk's session hasn't loaded yet, or if the Supabase client isn't available,
    // we can't proceed with auth synchronization.
    if (!isLoaded || !supabase) {
      setIsSupabaseAuthReady(false); // Not ready yet
      return;
    }

    // Set to false at the start of the sync attempt
    setIsSupabaseAuthReady(false);

    async function syncClerkSessionWithSupabase() {
      if (session) {
        // User is signed in with Clerk
        try {
          // Get a Clerk-issued JWT token, specifically configured for Supabase
          const clerkToken = await session.getToken({
            template: 'supabase', // This MUST match the JWT template name configured in Clerk
          });

          if (clerkToken) {
            // Use Supabase's auth.signInWithIdToken to set the session using the JWT.
            // This is the correct way to tell Supabase's GoTrue about the authenticated user.
            const { error: signInError } = await supabase.auth.signInWithIdToken({
              provider: 'token',
              token: clerkToken,
            });

            if (signInError) {
              console.error("Error setting Supabase session with Clerk token:", signInError);
            } else {
              // console.log("Supabase session successfully set via Clerk token.");
            }
          } else {
            console.warn("Clerk token for 'supabase' template was null or undefined.");
          }
        } catch (error) {
          console.error('Error in Clerk-Supabase sync process:', error);
        }
      } else {
        // User is signed out with Clerk (or no active session)
        // Ensure Supabase's session is also cleared.
        try {
          // Check if there's an active Supabase session before attempting to sign out
          const { data: { session: supabaseCurrentSession } } = await supabase.auth.getSession();
          if (supabaseCurrentSession) {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) {
              console.error("Error signing out of Supabase:", signOutError);
            } else {
              // console.log("Supabase session successfully cleared.");
            }
          }
        } catch (error) {
          console.error("Error checking/clearing Supabase session:", error);
        }
      }
      setIsSupabaseAuthReady(true); // Supabase auth state is now synchronized
    }

    syncClerkSessionWithSupabase();

    // The cleanup function for this effect is generally not needed here
    // because we are directly setting/clearing the session and using a singleton client.
    // Supabase's internal listeners (like onAuthStateChange) are handled by GoTrue itself.
  }, [session, isLoaded, supabase]); // Dependencies: re-run when Clerk session changes or client instance changes

  // Return the memoized object containing the Supabase client and its auth readiness state.
  // useMemo ensures this object itself is stable unless its contents change.
  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
