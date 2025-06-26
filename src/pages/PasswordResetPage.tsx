import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';

export default function PasswordResetPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordResetForm />
        </CardContent>
        <CardFooter className="text-center text-sm">
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
