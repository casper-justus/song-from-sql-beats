// src/contexts/ClerkSupabaseContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useClerkSupabaseClient } from '@/hooks/useClerkSupabaseClient'; // Import the hook
import { Database } from '@/integrations/supabase/types'; // Assuming this path and type definition

interface ClerkSupabaseContextInterface {
  supabase: SupabaseClient<Database> | null;
  isReady: boolean; // Indicates if the Supabase client AND auth sync are ready
}

const ClerkSupabaseContext = createContext<ClerkSupabaseContextInterface | undefined>(undefined);

export const ClerkSupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the custom hook to get the Supabase client and its auth readiness state
  const { supabase, isSupabaseAuthReady } = useClerkSupabaseClient(); // Destructure the new return value

  const contextValue = {
    supabase,
    isReady: !!supabase && isSupabaseAuthReady, // Ready if client exists AND auth sync is done
  };

  // Optional: You might want to render a loading spinner or placeholder here
  // while Supabase auth is not yet ready.
  // if (!contextValue.isReady) {
  //   return <div>Loading application data...</div>;
  // }

  return (
    <ClerkSupabaseContext.Provider value={contextValue}>
      {children}
    </ClerkSupabaseContext.Provider>
  );
};

export const useClerkSupabase = () => {
  const context = useContext(ClerkSupabaseContext);
  if (context === undefined) {
    throw new Error('useClerkSupabase must be used within a ClerkSupabaseProvider');
  }
  return context;
};
