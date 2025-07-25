import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

// ----------------------------------------------------------------------------------
// IMPORTANT: Initialize the Supabase client ONCE, OUTSIDE of any React component or hook.
// This ensures that createClient is called only one time when the module is loaded,
// guaranteeing a single GoTrueClient instance.
// ----------------------------------------------------------------------------------
const supabaseClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export function useClerkSupabaseClient(): SupabaseClient<Database> | null {
  const { session, isLoaded } = useSession(); // Get Clerk's session info
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false); // New state for auth readiness

  // Use the pre-initialized client instance
  const supabase = supabaseClientInstance;

  useEffect(() => {
    // If Clerk's session hasn't loaded yet, or if supabase client isn't ready,
    // we can't proceed with auth synchronization.
    if (!isLoaded || !supabase) {
      setIsSupabaseAuthReady(false); // Not ready yet
      return;
    }

    // Set to false while we try to sync auth
    setIsSupabaseAuthReady(false);

    async function syncClerkSessionWithSupabase() {
      if (session) {
        try {
          // Get the Clerk JWT token, ensuring it matches your Supabase JWT template
          const clerkToken = await session.getToken({
            template: 'supabase', // This must match your Clerk JWT template name
          });

          if (clerkToken) {
            // Use Supabase's auth.signInWithIdToken to set the session based on the JWT
            // This method handles GoTrue's internal state correctly.
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'token',
              token: clerkToken,
            });

            if (error) {
              console.error("Error setting Supabase session with Clerk token:", error);
            } else {
              // console.log("Supabase session successfully set via Clerk token.");
            }
          } else {
            // This case might happen if token generation fails or takes time.
            // Consider logging this as a warning in development.
            // console.warn("Clerk token for Supabase template was null or undefined.");
          }
        } catch (error) {
          console.error('Error in Clerk-Supabase sync:', error);
        }
      } else {
        // Clerk session is null (user logged out or not authenticated)
        // Ensure Supabase is also logged out.
        try {
          // Check if there's an active Supabase session to prevent unnecessary signOut calls
          const { data: { session: supabaseCurrentSession } } = await supabase.auth.getSession();
          if (supabaseCurrentSession) {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error("Error signing out of Supabase:", error);
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

    // Cleanup: This part is crucial for making sure GoTrue's internal state doesn't
    // get confused by old listeners.
    // However, since we're using a single client instance and direct session syncing,
    // we typically don't need a GoTrue onAuthStateChange listener here if Clerk is the primary auth.
    // The signInWithIdToken and signOut calls handle the direct state update.
  }, [session, isLoaded, supabase]); // Dependencies: re-run when Clerk session changes or client changes

  // Return an object that includes both the client and its auth readiness state
  // This allows the Provider to manage the loading state of components that depend on Supabase.
  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
