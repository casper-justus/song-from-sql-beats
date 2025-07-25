import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useClerkSupabaseClient } from '@/hooks/useClerkSupabaseClient'; // Import the custom hook
import { Database } from '@/integrations/supabase/types'; // Adjust this path if your Database type is elsewhere

// Define the interface for the context value
interface ClerkSupabaseContextInterface {
  supabase: SupabaseClient<Database> | null;
  isReady: boolean; // True when Supabase client is available AND auth sync with Clerk is complete
}

// Create the React Context
const ClerkSupabaseContext = createContext<ClerkSupabaseContextInterface | undefined>(undefined);

/**
 * Provides the Supabase client and its authentication readiness state to the component tree.
 * @param {ReactNode} children - The child components to be rendered within the provider's scope.
 */
export const ClerkSupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the custom hook to get the Supabase client and its auth readiness state
  const { supabase, isSupabaseAuthReady } = useClerkSupabaseClient();

  // Construct the value that will be provided to consumers of this context
  const contextValue = {
    supabase,
    // The context is considered "ready" when the Supabase client instance exists
    // AND its authentication state has been synchronized with Clerk.
    isReady: !!supabase && isSupabaseAuthReady,
  };

  // Optional: You can render a loading indicator or null here if the context is not yet ready.
  // This prevents child components from trying to use the Supabase client before it's fully set up.
  // Example:
  // if (!contextValue.isReady) {
  //   return <div>Loading application...</div>;
  // }

  return (
    <ClerkSupabaseContext.Provider value={contextValue}>
      {children}
    </ClerkSupabaseContext.Provider>
  );
};

/**
 * Custom hook to consume the ClerkSupabaseContext.
 * Throws an error if used outside of a ClerkSupabaseProvider.
 * @returns The SupabaseClient instance and its readiness state.
 */
export const useClerkSupabase = () => {
  const context = useContext(ClerkSupabaseContext);
  if (context === undefined) {
    throw new Error('useClerkSupabase must be used within a ClerkSupabaseProvider');
  }
  return context;
};
