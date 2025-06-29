
import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export function ClerkLoginForm() {
  return (
    <div className="w-full flex justify-center">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-[#282828] border-none shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton: "bg-green-500 hover:bg-green-400 text-black border-none",
            formButtonPrimary: "bg-green-500 hover:bg-green-400 text-black",
            formFieldInput: "bg-gray-700 border-gray-600 text-white",
            footerActionLink: "text-green-500 hover:text-green-400"
          }
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
