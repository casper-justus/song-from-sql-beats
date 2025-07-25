import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

const supabaseClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase URL or Anon Key is not defined. Please check your configuration.");
}

export function useClerkSupabaseClient(): {
  supabase: SupabaseClient<Database> | null;
  isSupabaseAuthReady: boolean;
} {
  const { session, isLoaded } = useSession();
  const [isSupabaseAuthReady, setIsSupabaseAuthReady] = useState(false);

  const supabase = supabaseClientInstance;

  useEffect(() => {
    if (!isLoaded || !supabase) {
      setIsSupabaseAuthReady(false);
      return;
    }

    setIsSupabaseAuthReady(false);

    async function syncClerkSessionWithSupabase() {
      if (session) {
        try {
          const clerkToken = await session.getToken({
            template: 'supabase', // This must match the JWT template name configured in Clerk
          });

          if (clerkToken) {
            // --- CRITICAL FIX HERE: REMOVE `provider: 'token'` ---
            const { error: signInError } = await supabase.auth.signInWithIdToken({
              token: clerkToken, // Just pass the token directly
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
        try {
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
      setIsSupabaseAuthReady(true);
    }

    syncClerkSessionWithSupabase();
  }, [session, isLoaded, supabase]);

  return useMemo(() => ({
    supabase,
    isSupabaseAuthReady
  }), [supabase, isSupabaseAuthReady]);
}
