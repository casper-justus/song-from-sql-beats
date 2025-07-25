import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types'; // Adjust this path if your Database type is elsewhere

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

// ----------------------------------------------------------------------------------
// Initialize the Supabase client ONCE, OUTSIDE of any React component or hook.
// IMPORTANT: We're NOT passing auth.global.fetch here anymore for signInWithIdToken.
// Instead, we will directly set the JWT on the client when it's available.
// ----------------------------------------------------------------------------------
const supabaseClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase URL or Anon Key is not defined. Please check your configuration.");
}

export function useClerkSupabaseClient(): {
  supabase: SupabaseClient<Database> | null;
  isSupabaseAuthReady: boolean;
} {
  const { session, isLoaded } = useSession(); // Clerk's session state
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false); // Tracks if Supabase is ready

  const supabase = supabaseClientInstance; // Use the singleton instance

  useEffect(() => {
    // We are ready if Clerk session is loaded and client is available
    if (!isLoaded || !supabase) {
      setIsSupabaseAuthReady(false);
      return;
    }

    async function setSupabaseJwt() {
      setIsSupabaseAuthReady(false); // Indicate that auth sync is in progress

      if (session) {
        try {
          // Get the Clerk JWT token, configured for Supabase
          const clerkToken = await session.getToken({
            template: 'supabase', // This MUST match the JWT template name configured in Clerk
          });

          if (clerkToken) {
            // Set the JWT token directly on the Supabase client.
            // This bypasses GoTrue's internal signInWithIdToken for external JWTs.
            // All subsequent requests made by this supabase client instance will
            // include this token in the Authorization header.
            supabase.auth.setAuth(clerkToken);
            // console.log("Supabase client JWT set successfully from Clerk token.");
          } else {
            console.warn("Clerk token for 'supabase' template was null or undefined. Supabase client will use anon key.");
            // If no token, clear any existing auth and fall back to anon key
            supabase.auth.setAuth('');
          }
        } catch (error) {
          console.error('Error getting Clerk token and setting Supabase JWT:', error);
          supabase.auth.setAuth(''); // Clear auth on error
        }
      } else {
        // Clerk user is signed out, clear any active JWT from the Supabase client
        supabase.auth.setAuth('');
        // console.log("Supabase client JWT cleared.");
      }
      setIsSupabaseAuthReady(true); // Supabase client is now configured with the correct JWT (or none)
    }

    setSupabaseJwt();

    // No need for a cleanup function as we're just setting a token on a persistent client.
  }, [session, isLoaded, supabase]); // Depend on session, isLoaded, and the supabase client instance

  // Return the memoized object containing the Supabase client and its readiness state
  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
