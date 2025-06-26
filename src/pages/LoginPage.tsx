import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from '@/components/auth/LoginForm';
import { SocialLogins } from '@/components/auth/SocialLogins';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
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
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm />
          <Separator className="my-4" />
          <SocialLogins />
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm">
          <Link to="/signup" className="text-blue-600 hover:underline dark:text-blue-400">
            Don't have an account? Sign Up
          </Link>
          <Link to="/password-reset" className="text-blue-600 hover:underline dark:text-blue-400">
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
