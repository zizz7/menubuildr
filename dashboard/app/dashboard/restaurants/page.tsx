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
        // Check limit
        if (restaurants.length >= 5) {
          toast.error('Maximum 5 restaurants allowed');
          return;
        }
        await apiClient.post('/restaurants', formData);
        toast.success('Restaurant created successfully');
      }
      setDialogOpen(false);
      fetchRestaurants();
    } catch (error: any) {
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
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-gray-600 mt-2">Manage your restaurants ({restaurants.length}/5)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRestaurant ? 'Edit Restaurant' : 'Create Restaurant'}
              </DialogTitle>
              <DialogDescription>
                {editingRestaurant
                  ? 'Update restaurant information'
                  : 'Add a new restaurant to manage'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      })
                    }
                    required
                  />
                <p className="text-xs text-gray-500">
                  URL-friendly identifier (lowercase, numbers, hyphens only)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value.toUpperCase() })
                    }
                    required
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <Input
                    id="defaultLanguage"
                    value={formData.defaultLanguage}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultLanguage: e.target.value.toUpperCase() })
                    }
                    required
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoUrl">Logo (optional)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogoInputMode('upload')}
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant={logoInputMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogoInputMode('url')}
                    >
                      URL
                    </Button>
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
                      className="w-full"
                      disabled={logoUploading}
                    />
                    {logoUploading && (
                      <p className="text-xs text-blue-500">Uploading logo...</p>
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
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <Label>Preview</Label>
                    <div className="mt-3 flex items-center gap-4">
                      <div
                        className="w-24 h-24 flex items-center justify-center border-2 border-gray-300 rounded bg-white overflow-hidden"
                        style={{ minWidth: '96px', minHeight: '96px' }}
                      >
                        <img
                          src={formData.logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-red-100 rounded"><span class="text-xs text-red-500">Failed to load</span></div>';
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 break-all">
                          {formData.logoUrl}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setFormData({ ...formData, logoUrl: '' });
                            const fileInput = document.getElementById('logoFile') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRestaurant ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => {
          const logoPosition = restaurant.logoPosition || 'right';
          const hasLogo = restaurant.logoUrl && restaurant.logoUrl.trim().length > 0;
          const cardStyle = hasLogo && logoPosition === 'background' 
            ? { 
                backgroundImage: `url('${restaurant.logoUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative' as const,
              }
            : {};

          return (
            <Card
              key={restaurant.id}
              className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => handleSelectRestaurant(restaurant)}
              style={cardStyle}
            >
              {hasLogo && logoPosition === 'background' && (
                <div className="absolute inset-0 bg-white/85 z-0" />
              )}
              <CardHeader className={hasLogo && logoPosition === 'background' ? 'relative z-10' : ''}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {hasLogo && logoPosition === 'right' ? (
                      <div className="w-12 h-12 flex items-center justify-center border-2 border-gray-200 rounded bg-white overflow-hidden flex-shrink-0">
                        <img
                          src={restaurant.logoUrl}
                          alt={`${restaurant.name} logo`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <Store className="h-6 w-6 text-gray-600 flex-shrink-0" />
                    )}
                    <CardTitle className={hasLogo && logoPosition === 'background' ? 'text-shadow' : ''}>
                      {restaurant.name}
                    </CardTitle>
                  </div>
                  {restaurant.activeStatus ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <CardDescription className={hasLogo && logoPosition === 'background' ? 'text-shadow' : ''}>
                  {restaurant.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className={hasLogo && logoPosition === 'background' ? 'relative z-10' : ''}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">{restaurant.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Language:</span>
                  <span className="font-medium">{restaurant.defaultLanguage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Menus:</span>
                  <span className="font-medium">{restaurant._count?.menus || 0}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(restaurant)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(restaurant.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {restaurants.length === 0 && (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No restaurants yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Get started by creating your first restaurant
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Restaurant
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

