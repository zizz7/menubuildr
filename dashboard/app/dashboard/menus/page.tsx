'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import { useMenuStore } from '@/lib/store/menu-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BookOpen, Edit, Trash2, Copy, Eye, CheckCircle, XCircle, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { MultiLanguageInput } from '@/components/multi-language-input';
import { TemplateSelector } from '@/components/menu/TemplateSelector';
import { PreviewModal } from '@/components/menu/PreviewModal';

interface Menu {
  id: string;
  restaurantId: string;
  name: Record<string, string>;
  slug: string;
  menuType: string;
  status: 'draft' | 'published';
  orderIndex: number;
  _count?: {
    sections: number;
  };
}

export default function MenusPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { selectedRestaurant, restaurants } = useRestaurantStore();
  const { menus, setMenus, setSelectedMenu } = useMenuStore();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: {} as Record<string, string>,
    slug: '',
    menuType: 'breakfast',
  });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingMenu, setPublishingMenu] = useState<Menu | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateSlug, setPreviewTemplateSlug] = useState('classic');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        // Fetch restaurants if not already loaded
        if (restaurants.length === 0) {
          const response = await apiClient.get('/restaurants');
          const { setRestaurants } = useRestaurantStore.getState();
          setRestaurants(response.data);
          
          if (response.data.length > 0) {
            setSelectedRestaurantId(response.data[0].id);
            await fetchMenus(response.data[0].id);
          } else {
            setLoading(false);
          }
        } else {
          // Restaurants already loaded
          if (selectedRestaurant) {
            setSelectedRestaurantId(selectedRestaurant.id);
            await fetchMenus(selectedRestaurant.id);
          } else if (restaurants.length > 0) {
            setSelectedRestaurantId(restaurants[0].id);
            await fetchMenus(restaurants[0].id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load restaurants:', error);
        setLoading(false);
      }
    };

    loadData();
    fetchLanguages();
  }, [selectedRestaurant, restaurants.length]);

  const fetchLanguages = async () => {
    try {
      const response = await apiClient.get('/languages');
      setLanguages(response.data.filter((l: any) => l.isActive));
    } catch (error: any) {
      console.error('Failed to fetch languages:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set default languages if API fails
      setLanguages([
        { code: 'ENG', name: 'English' },
        { code: 'CHN', name: 'Chinese' },
        { code: 'GER', name: 'German' },
        { code: 'JAP', name: 'Japanese' },
        { code: 'RUS', name: 'Russian' },
      ]);
      toast.error('Failed to load languages. Using defaults.');
    }
  };

  const fetchMenus = async (restaurantId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/menus/restaurant/${restaurantId}`);
      setMenus(response.data);
    } catch (error) {
      toast.error('Failed to fetch menus');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    fetchMenus(restaurantId);
  };

  const handleOpenDialog = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        name: menu.name,
        slug: menu.slug,
        menuType: menu.menuType,
      });
    } else {
      setEditingMenu(null);
      const defaultName: Record<string, string> = {};
      languages.forEach((lang) => {
        defaultName[lang.code] = '';
      });
      setFormData({
        name: defaultName,
        slug: '',
        menuType: 'breakfast',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) {
      toast.error('Please select a restaurant');
      return;
    }

    // Validate that at least one language has a name
    const hasName = Object.values(formData.name).some((name) => name && name.trim().length > 0);
    if (!hasName) {
      toast.error('Please enter a menu name in at least one language');
      return;
    }

    // Validate slug
    if (!formData.slug || formData.slug.trim().length === 0) {
      toast.error('Please enter a slug');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    try {
      if (editingMenu) {
        await apiClient.put(`/menus/${editingMenu.id}`, formData);
        toast.success('Menu updated successfully');
      } else {
        // Check limit
        const currentMenus = menus.filter((m) => m.restaurantId === selectedRestaurantId);
        if (currentMenus.length >= 4) {
          toast.error('Maximum 4 menus per restaurant');
          return;
        }
        await apiClient.post(`/menus/restaurant/${selectedRestaurantId}`, formData);
        toast.success('Menu created successfully');
      }
      setDialogOpen(false);
      if (selectedRestaurantId) {
        fetchMenus(selectedRestaurantId);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Operation failed';
      toast.error(errorMsg);
      console.error('Menu creation error:', error.response?.data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu?')) return;
    try {
      await apiClient.delete(`/menus/${id}`);
      toast.success('Menu deleted successfully');
      if (selectedRestaurantId) {
        fetchMenus(selectedRestaurantId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete menu');
    }
  };

  const handleDuplicate = async (menu: Menu) => {
    try {
      await apiClient.post(`/menus/${menu.id}/duplicate`);
      toast.success('Menu duplicated successfully');
      if (selectedRestaurantId) {
        fetchMenus(selectedRestaurantId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to duplicate menu');
    }
  };

  const handlePublish = async (menu: Menu) => {
    setPublishingMenu(menu);
    setSelectedTemplateId(null);
    setPublishDialogOpen(true);
  };

  const handleRepublish = async (menu: Menu) => {
    setPublishingMenu(menu);
    setSelectedTemplateId(null);
    setPublishDialogOpen(true);
  };

  const handleConfirmPublish = () => {
    if (!publishingMenu) return;

    const menuId = publishingMenu.id;
    const menuName = publishingMenu.name['ENG'] || 'Menu';

    // Close dialog immediately so the user isn't blocked
    setPublishDialogOpen(false);
    setPublishingMenu(null);

    toast.info(`Publishing "${menuName}"...`, {
      description: 'Translating and generating HTML in the background.',
      duration: 4000,
    });

    // Fire the publish request in the background
    apiClient
      .post(`/menus/${menuId}/publish`, {
        ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
      })
      .then((response) => {
        const shareableLink = response.data.shareableLink;
        toast.success(`"${menuName}" published!`, {
          description: shareableLink ? 'Shareable link copied to clipboard.' : '',
          duration: 5000,
        });
        if (response.data.warning) {
          toast.warning(response.data.warning);
        }
        if (shareableLink) {
          navigator.clipboard.writeText(shareableLink).catch(() => {});
        }
        // Refresh menu list to update status
        if (selectedRestaurantId) {
          fetchMenus(selectedRestaurantId);
        }
      })
      .catch((error: any) => {
        toast.error(error.response?.data?.error || `Failed to publish "${menuName}"`);
      });
  };

  const handleCopyLink = async (menu: Menu) => {
    try {
      // Prefer restaurant slug from store to avoid extra API call and RDP/network issues
      let restaurantSlug = restaurants.find((r) => r.id === menu.restaurantId)?.slug;
      if (!restaurantSlug) {
        const res = await apiClient.get(`/restaurants/${menu.restaurantId}`);
        restaurantSlug = res.data.slug;
      }
      const baseUrl = window.location.origin;
      const shareableLink = `${baseUrl}/menu/${restaurantSlug}/${menu.slug}`;

      const copyToClipboard = async (text: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      };

      await copyToClipboard(shareableLink);
      toast.success('Link copied to clipboard!', {
        description: shareableLink,
        duration: 5000,
      });
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to copy link';
      toast.error(msg, {
        description: 'You can copy the link from the address bar when you open the menu.',
        duration: 5000,
      });
    }
  };

  const handleSelectMenu = (menu: Menu) => {
    setSelectedMenu(menu);
    router.push(`/dashboard/menus/${menu.id}`);
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

  if (restaurants.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
            <p className="text-gray-600 text-center mb-4">
              Create a restaurant first to manage menus
            </p>
            <Button onClick={() => router.push('/dashboard/restaurants')}>
              Go to Restaurants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentRestaurantMenus = menus.filter((m) => m.restaurantId === selectedRestaurantId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Menus</h1>
          <p className="text-gray-600 mt-2">
            Manage menus for your restaurants ({currentRestaurantMenus.length}/4)
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedRestaurantId || ''}
            onValueChange={handleRestaurantChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select restaurant" />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} disabled={!selectedRestaurantId}>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full">
              <DialogHeader>
                <DialogTitle>
                  {editingMenu ? 'Edit Menu' : 'Create Menu'}
                </DialogTitle>
                <DialogDescription>
                  {editingMenu
                    ? 'Update menu information'
                    : 'Add a new menu (max 4 per restaurant)'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <MultiLanguageInput
                  label="Menu Name"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  languages={languages}
                  defaultLanguage={selectedRestaurant?.defaultLanguage || 'ENG'}
                  placeholder="Enter menu name"
                  showTranslate={true}
                />
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
                <div className="space-y-2">
                  <Label htmlFor="menuType">Menu Type</Label>
                  <Select
                    value={formData.menuType}
                    onValueChange={(value) => setFormData({ ...formData, menuType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="drinks">Drinks</SelectItem>
                    </SelectContent>
                  </Select>
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
                    {editingMenu ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentRestaurantMenus.map((menu) => (
          <Card
            key={menu.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleSelectMenu(menu)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-gray-600" />
                  <CardTitle>
                    {menu.name[selectedRestaurant?.defaultLanguage || 'ENG'] || 'Untitled Menu'}
                  </CardTitle>
                </div>
                {menu.status === 'published' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <CardDescription>
                {menu.slug} • {menu.menuType}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      menu.status === 'published' ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {menu.status.charAt(0).toUpperCase() + menu.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sections:</span>
                  <span className="font-medium">{menu._count?.sections || 0}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectMenu(menu)}
                  className="flex-shrink-0"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(menu)}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                {menu.status === 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePublish(menu)}
                    className="flex-shrink-0"
                  >
                    Publish
                  </Button>
                )}
                {menu.status === 'published' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRepublish(menu)}
                      title="Regenerate static HTML menu"
                      className="flex-shrink-0"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Republish
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(menu)}
                      title="Copy shareable link"
                      className="flex-shrink-0"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(menu.id)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentRestaurantMenus.length === 0 && selectedRestaurantId && (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No menus yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Get started by creating your first menu
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Publish Dialog with Template Selection */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>
              {publishingMenu?.status === 'published' ? 'Republish Menu' : 'Publish Menu'}
            </DialogTitle>
            <DialogDescription>
              Choose a template for your HTML menu, then publish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={(template) => setSelectedTemplateId(template.id)}
              onPreview={(template) => {
                setPreviewTemplateSlug(template.slug);
                setPreviewOpen(true);
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPublish}>
                {publishingMenu?.status === 'published' ? 'Republish' : 'Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {publishingMenu && (
        <PreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          menuId={publishingMenu.id}
          templateSlug={previewTemplateSlug}
        />
      )}
    </div>
  );
}

