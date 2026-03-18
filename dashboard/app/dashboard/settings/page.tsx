'use client';

import * as React from 'react';
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
      setImgCacheBust(String(Date.now()));
      toast.success('Profile image updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isAuthenticated()) return null;

  // Cache-bust at render time only — never persist ?t= in the store
  const [imgCacheBust, setImgCacheBust] = useState('');
  const imageUrl = admin?.profileImageUrl
    ? `${resolveAssetUrl(admin.profileImageUrl)}${imgCacheBust ? `?t=${imgCacheBust}` : ''}`
    : null;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">
              Account Settings
            </h1>
            <div className="flex items-center gap-3 text-muted">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-input/40 text-[11px] font-bold uppercase tracking-wider border border-input/30">
                <Database className="h-3 w-3" />
                v1.0.0
              </span>
              <p className="text-sm font-medium opacity-80 leading-none">
                Manage your profile and security preferences.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Settings */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-input/20 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Profile Details</CardTitle>
                  <CardDescription>Your personal and contact information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted px-1">Full Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Your name"
                      className="h-11 border-input/50 focus:border-primary/50 transition-all" 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted px-1">Email Address</Label>
                    <div className="relative">
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        disabled 
                        className="h-11 bg-input/20 border-input/30 text-muted opacity-80 cursor-not-allowed" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Lock className="h-3.5 w-3.5 text-muted/50" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={profileLoading} className="h-11 px-8 font-bold tracking-tight shadow-md shadow-primary/20">
                    <Save className="h-4 w-4 mr-2" />
                    {profileLoading ? 'Saving...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/10">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Security</CardTitle>
                  <CardDescription>Update your credentials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="currentPassword" title="current-password" className="text-xs font-bold uppercase tracking-wider text-muted px-1">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    autoComplete="current-password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password"
                    className="h-11 border-input/50 focus:border-primary/50" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="newPassword" title="new-password" className="text-xs font-bold uppercase tracking-wider text-muted px-1">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      autoComplete="new-password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Min 8 characters"
                      className="h-11 border-input/50 focus:border-primary/50" 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="confirmPassword" title="confirm-password" className="text-xs font-bold uppercase tracking-wider text-muted px-1">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      autoComplete="new-password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Confirm new password"
                      className="h-11 border-input/50 focus:border-primary/50" 
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={passwordLoading} variant="outline" className="h-11 px-8 font-bold tracking-tight border-input/50 hover:bg-input/50">
                    <Lock className="h-4 w-4 mr-2" />
                    {passwordLoading ? 'Updating...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Sidebar Section: Profile Image */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-lg bg-input/20 border border-input flex items-center justify-center overflow-hidden relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <User className="h-12 w-12 text-muted" />
                    )}
                    {imageLoading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageLoading}
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform z-10"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted font-medium mb-3">JPG, PNG, WebP or SVG.<br/>Max 5MB.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageLoading}
                    className="h-8 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                  >
                    {imageLoading ? 'Uploading...' : 'Upload New'}
                  </Button>
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

          {/* System Info */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Deployment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-black/[0.03] border border-input/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Version</span>
                    <span className="text-xs font-bold text-foreground">1.0.0</span>
                  </div>
                  <div className="w-full h-1 bg-input/20 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-primary/40" />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-black/[0.03] border border-input/20">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">API Endpoint</div>
                  <div className="font-mono text-[10px] text-primary truncate bg-white/50 p-1.5 rounded border border-input/10">
                    {process.env.NEXT_PUBLIC_API_URL || 'Not configured'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
