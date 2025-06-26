import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateUserPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/components/ui/use-toast';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check for Supabase auth token in URL fragment, which indicates user came from password reset email.
  // Supabase client handles this automatically when updateUser is called.
  useEffect(() => {
    // Supabase JS client automatically extracts the access_token from the URL hash.
    // We just need to ensure this page is loaded.
    // If there's no access_token (e.g. user navigates here directly), updateUser will fail, which is expected.
    const hash = location.hash;
    if (hash.includes('error_description')) {
        const params = new URLSearchParams(hash.substring(1)); // remove #
        const errorDesc = params.get('error_description');
        setError(`Error: ${errorDesc || 'Invalid recovery link.'}`);
        toast({
            title: "Password Update Error",
            description: `Error: ${errorDesc || 'Invalid recovery link.'}`,
            variant: "destructive",
        });
    } else if (!hash.includes('access_token')) {
        // This is not strictly an error if the user hasn't submitted the form yet,
        // but can be a hint if they landed here without a token.
        // The actual error will be caught when they try to update the password.
        console.warn("No access token found in URL. Ensure you've arrived from a password reset link.");
    }
  }, [location, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
        return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    const { data, error: updateError } = await updateUserPassword(password);
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      toast({
        title: "Password Update Failed",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      setMessage('Password updated successfully! You can now log in with your new password.');
      toast({
        title: "Password Updated",
        description: "You can now log in with your new password.",
      });
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after a delay
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Update Your Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500">{error}</p>}
            {message && <p className="text-green-500">{message}</p>}
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
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
