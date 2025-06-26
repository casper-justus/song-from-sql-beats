import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SocialLogins } from '@/components/auth/SocialLogins';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUpPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/'); // Redirect to home if already logged in
    }
  }, [session, loading, navigate]);

  if (loading || session) {
    // Render nothing or a loading indicator while checking auth state or if redirecting
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Sign up with your email or a social provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignUpForm />
          <Separator className="my-4" />
          <SocialLogins />
        </CardContent>
        <CardFooter className="text-center text-sm">
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Already have an account? Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
