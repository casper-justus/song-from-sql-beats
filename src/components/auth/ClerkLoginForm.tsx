
import React from 'react';
import { Button } from '@/components/ui/button';
import { Browser } from '@capacitor/browser';

export function ClerkLoginForm() {
  const handleLogin = async () => {
    await Browser.open({ url: 'https://accounts.kazp.us/sign-in' });
  };

  return (
    <div className="w-full flex justify-center">
      <Button onClick={handleLogin} className="w-full bg-green-500 hover:bg-green-400 text-black">
        Login with Clerk
      </Button>
    </div>
  );
}
