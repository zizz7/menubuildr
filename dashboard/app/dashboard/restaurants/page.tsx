'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Store, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getServerUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpgradePrompt } from '@/lib/hooks/useUpgradePrompt';
import { UpgradePrompt } from '@/components/billing/upgrade-prompt';
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  logoPosition?: string;
  currency: string;
  defaultLanguage: string;
  activeStatus: boolean;
  _count?: {
    menus: number;
  };
}

export default function RestaurantsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants, setRestaurants, setSelectedRestaurant } = useRestaurantStore();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    currency: 'USD',
    defaultLanguage: 'ENG',
    logoUrl: '',
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('url');
  const upgradePrompt = useUpgradePrompt();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await apiClient.get('/restaurants');
      setRestaurants(response.data);
    } catch (error) {
      toast.error('Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setFormData({
        name: restaurant.name,
        slug: restaurant.slug,
        currency: restaurant.currency,
        defaultLanguage: restaurant.defaultLanguage,
        logoUrl: restaurant.logoUrl || '',
      });
      // Determine input mode based on existing logoUrl
      setLogoInputMode(restaurant.logoUrl && restaurant.logoUrl.startsWith('http') ? 'url' : 'upload');
    } else {
      setEditingRestaurant(null);
      setFormData({
        name: '',
        slug: '',
        currency: 'USD',
        defaultLanguage: 'ENG',
        logoUrl: '',
      });
      setLogoInputMode('url');
    }
    setDialogOpen(true);
  };

  const handleLogoUpload = async (file: File) => {
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (PNG, SVG, JPEG, or WebP)');
      return;
    }

    setLogoUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('logo', file);

      const response = await apiClient.post('/upload/logo', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Use URL as-is if it's already a full URL (Cloudinary), otherwise construct full URL
      const url = response.data.url;
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `${getServerUrl()}${url}`;

      setFormData({ ...formData, logoUrl: fullUrl });
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to upload logo';
      toast.error(errorMsg);
      console.error('Logo upload error:', error);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRestaurant) {
        await apiClient.put(`/restaurants/${editingRestaurant.id}`, formData);
        toast.success('Restaurant updated successfully');
      } else {
        await apiClient.post('/restaurants', formData);
        toast.success('Restaurant created successfully');
      }
      setDialogOpen(false);
      fetchRestaurants();
    } catch (error: any) {
      if (upgradePrompt.checkLimit(error)) {
        setDialogOpen(false);
        return;
      }
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Operation failed';
      toast.error(errorMsg);
      console.error('Restaurant error:', error.response?.data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;
    try {
      await apiClient.delete(`/restaurants/${id}`);
      toast.success('Restaurant deleted successfully');
      fetchRestaurants();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete restaurant');
    }
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant as any);
    router.push('/dashboard/menus');
  };

  if (loading) {
    return (
      <div className="p-10 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="text" className="h-9 w-44 rounded-md" />
            <Skeleton variant="text" className="h-5 w-56 mt-2 rounded-md" />
          </div>
          <Skeleton variant="rounded" className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/50 overflow-hidden rounded-lg shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton variant="rounded" className="h-14 w-14" />
                  <Skeleton variant="rounded" className="h-6 w-16" />
                </div>
                <Skeleton variant="text" className="h-7 w-40 rounded-md" />
                <Skeleton variant="text" className="h-4 w-24 mt-1 rounded" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-2 py-4 border-y border-input">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton variant="text" className="h-3 w-12 rounded" />
                      <Skeleton variant="text" className="h-5 w-8 rounded" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton variant="rounded" className="h-9 flex-1" />
                  <Skeleton variant="rounded" className="h-9 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Restaurants</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Manage your establishments ({restaurants.length}/5)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="h-10 px-6 font-bold shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-full border border-border shadow-md rounded-lg p-0 overflow-hidden">
            <div className="p-8 border-b border-border/30 bg-muted/50">
              <DialogTitle className="text-xl font-bold tracking-tight">
                {editingRestaurant ? 'Edit Restaurant' : 'Create Restaurant'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {editingRestaurant
                  ? 'Update restaurant information and branding details.'
                  : 'Register a new establishment to manage its menus.'}
              </DialogDescription>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. The Green Bistro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-semibold">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  placeholder="the-green-bistro"
                  required
                />
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Lower-case, numbers, and hyphens only
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm font-semibold">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value.toUpperCase() })
                    }
                    className="h-10 border-input/50"
                    required
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage" className="text-sm font-semibold">Language</Label>
                  <Input
                    id="defaultLanguage"
                    value={formData.defaultLanguage}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultLanguage: e.target.value.toUpperCase() })
                    }
                    className="h-10 border-input/50"
                    required
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Logo (optional)</Label>
                  <div className="flex p-1 rounded-lg bg-muted border border-border/50">
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${logoInputMode === 'upload' ? 'bg-card text-foreground shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setLogoInputMode('upload')}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${logoInputMode === 'url' ? 'bg-card text-foreground shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setLogoInputMode('url')}
                    >
                      URL
                    </button>
                  </div>
                </div>
                
                {logoInputMode === 'upload' ? (
                  <div className="space-y-3">
                    <Input
                      id="logoFile"
                      type="file"
                      accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleLogoUpload(file);
                        }
                      }}
                      disabled={logoUploading}
                    />
                    {logoUploading && (
                      <p className="text-xs text-primary font-medium">Uploading logo...</p>
                    )}
                  </div>
                ) : (
                  <Input
                    id="logoUrl"
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                )}

                {formData.logoUrl && (
                  <div className="p-4 border rounded-lg border-input bg-surface/50">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</Label>
                    <div className="mt-3 flex items-center gap-4">
                      <div
                        className="w-20 h-20 flex items-center justify-center border border-input rounded bg-surface overflow-hidden"
                      >
                        <img
                          src={formData.logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[10px] text-muted-foreground break-all leading-tight font-medium">
                          {formData.logoUrl}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setFormData({ ...formData, logoUrl: '' });
                          }}
                        >
                          Clear Image
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-input/20">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="h-10 px-6 font-medium"
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-8 font-bold shadow-sm">
                  {editingRestaurant ? 'Save Changes' : 'Create Restaurant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {restaurants.map((restaurant) => {
          const logoPosition = restaurant.logoPosition || 'right';
          const hasLogo = restaurant.logoUrl && restaurant.logoUrl.trim().length > 0;
          
          return (
            <Card
              key={restaurant.id}
              className="group border-border/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden rounded-lg shadow-sm"
              onClick={() => handleSelectRestaurant(restaurant)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  {hasLogo && logoPosition === 'right' ? (
                    <div className="w-14 h-14 flex items-center justify-center border border-input/50 rounded-md bg-white overflow-hidden transition-transform group-hover:scale-105">
                      <img
                        src={restaurant.logoUrl}
                        alt={`${restaurant.name} logo`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-muted border border-border/50 text-primary">
                      <Store className="h-5 w-5" />
                    </div>
                  )}
                  {restaurant.activeStatus ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {restaurant.name}
                </CardTitle>
                <CardDescription className="font-medium text-xs font-mono text-muted-foreground pt-1 opacity-60">
                  /{restaurant.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-2 py-4 border-y border-input">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Currency</span>
                    <p className="font-semibold text-foreground">{restaurant.currency}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Lang</span>
                    <p className="font-semibold text-foreground">{restaurant.defaultLanguage}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Menus</span>
                    <p className="font-semibold text-foreground">{restaurant._count?.menus || 0}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs font-bold border border-border/50 hover:bg-muted h-9"
                    onClick={() => handleOpenDialog(restaurant)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-2 text-primary" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs font-bold border border-border/50 hover:bg-red-50 hover:text-red-600 h-9"
                    onClick={() => handleDelete(restaurant.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {restaurants.length === 0 && (
        <Card className="bg-surface/20 border-dashed border-2 flex flex-col items-center justify-center p-20 text-center">
          <div className="p-6 rounded-md bg-surface border border-input text-muted-foreground mb-6 shadow-sm">
            <Store className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create your first restaurant</CardTitle>
          <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed font-medium">
            Register your establishment to start building digital menus for your customers.
          </p>
          <Button size="lg" className="mt-8 px-10 h-12 text-base font-bold shadow-lg shadow-primary/20" onClick={() => handleOpenDialog()}>
            <Plus className="h-5 w-5 mr-3" />
            Get Started
          </Button>
        </Card>
      )}

      <UpgradePrompt
        open={upgradePrompt.open}
        onOpenChange={upgradePrompt.setOpen}
        resource={upgradePrompt.resource}
        current={upgradePrompt.current}
        limit={upgradePrompt.limit}
      />
    </div>
  );
}

