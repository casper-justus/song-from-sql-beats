
import React from 'react';
import { Button } from '@/components/ui/button';
import { Browser } from '@capacitor/browser';

export function ClerkSignUpForm() {
  const handleSignUp = async () => {
    await Browser.open({ url: 'https://accounts.kazp.us/sign-up' });
  };

  return (
    <div className="w-full flex justify-center">
      <Button onClick={handleSignUp} className="w-full bg-green-500 hover:bg-green-400 text-black">
        Sign Up with Clerk
      </Button>
    </div>
  );
}
