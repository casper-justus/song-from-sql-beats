
import { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

export function useClerkSupabaseClient(): SupabaseClient<Database> | null {
  const { session, isLoaded } = useSession();

  const supabase = useMemo(() => {
    if (isLoaded && session) {
      return createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            fetch: async (url, options: RequestInit = {}) => {
              try {
                const clerkToken = await session.getToken({ template: 'supabase' });
                const headers = new Headers(options.headers || {});
                if (clerkToken) {
                  headers.set('Authorization', `Bearer ${clerkToken}`);
                }
                return fetch(url, { ...options, headers });
              } catch (error) {
                console.error('Error getting Clerk token:', error);
                return fetch(url, options);
              }
            },
          },
        }
      );
    }
    return null;
  }, [session, isLoaded]);

  return supabase;
}
