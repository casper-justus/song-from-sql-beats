
import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useClerkSupabaseClient } from '@/hooks/useClerkSupabaseClient';
import { Database } from '@/integrations/supabase/types';

interface ClerkSupabaseContextInterface {
  supabase: SupabaseClient<Database> | null;
  isReady: boolean;
}

const ClerkSupabaseContext = createContext<ClerkSupabaseContextInterface | undefined>(undefined);

export const ClerkSupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabase = useClerkSupabaseClient();

  const contextValue = {
    supabase,
    isReady: !!supabase,
  };

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
