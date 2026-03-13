'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, User, Lock, Camera, Database } from 'lucide-react';
import { resolveAssetUrl } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, admin, updateAdmin } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (admin) {
      setName(admin.name || '');
      setEmail(admin.email || '');
    }
  }, [admin, isAuthenticated, router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setProfileLoading(true);
    try {
      const res = await apiClient.put('/auth/profile', { name: name.trim() });
      updateAdmin({ name: res.data.name, profileImageUrl: res.data.profileImageUrl });
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPasswordLoading(true);
    try {
      await apiClient.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageLoading(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const res = await apiClient.post('/auth/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateAdmin({ profileImageUrl: res.data.profileImageUrl });
      toast.success('Profile image updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isAuthenticated()) return null;

  const imageUrl = admin?.profileImageUrl
    ? resolveAssetUrl(admin.profileImageUrl)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your account settings</p>
      </div>

      <div className="space-y-6">
        {/* Profile Image */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base">Profile Image</CardTitle>
            </div>
            <CardDescription>Upload a logo or profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageLoading}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageLoading}
                >
                  {imageLoading ? 'Uploading...' : 'Change Image'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP or SVG. Max 5MB.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400">Email cannot be changed</p>
              </div>
              <Button type="submit" disabled={profileLoading} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base">Change Password</CardTitle>
            </div>
            <CardDescription>Keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              </div>
              <Button type="submit" disabled={passwordLoading} size="sm">
                <Lock className="h-4 w-4 mr-2" />
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base">System</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-500">API</span>
                <span className="font-medium text-xs">{process.env.NEXT_PUBLIC_API_URL || 'Not configured'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
