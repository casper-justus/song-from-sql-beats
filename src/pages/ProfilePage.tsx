
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Using any to bypass TypeScript issues until types are regenerated
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          username: data.username || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error loading profile",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setUpdating(true);
      // Using any to bypass TypeScript issues until types are regenerated
      const { error } = await (supabase as any)
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error updating profile",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully!",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error updating profile",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
        <p className="text-center">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white max-w-2xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Profile</h1>
        <p className="text-lg text-gray-400">Manage your account settings</p>
      </header>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-gray-700 text-white text-2xl">
                <User size={32} />
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-white">User Profile</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white flex items-center gap-2">
              <Mail size={16} />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-white">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-2">
            <Label htmlFor="avatarUrl" className="text-white">
              Avatar URL
            </Label>
            <Input
              id="avatarUrl"
              type="url"
              placeholder="Enter avatar image URL"
              value={profile.avatar_url}
              onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Account Info */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Calendar size={16} />
              Account created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={updateProfile}
              disabled={updating}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </Button>
            <Button
              onClick={signOut}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
