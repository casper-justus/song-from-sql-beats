import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';

export default function PasswordResetPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#121212' }}>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">Your App Name</h1>
      </div>

      <Card className="w-full max-w-md bg-[#282828] border-none shadow-2xl rounded-xl">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white">Reset your password</CardTitle>
          <p className="text-gray-400 text-sm mt-2 px-4">
            Enter the email address associated with your account, and we’ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <PasswordResetForm />
        </CardContent>
        <CardFooter className="p-6 sm:p-8 border-t border-gray-700 mt-2 text-center">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white hover:underline">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
