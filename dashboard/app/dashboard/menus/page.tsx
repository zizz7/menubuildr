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
import { Skeleton } from '@/components/ui/skeleton';

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
      <div className="p-10 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="text" className="h-9 w-32 rounded-md" />
            <Skeleton variant="text" className="h-5 w-64 mt-2 rounded-md" />
          </div>
          <div className="flex gap-3">
            <Skeleton variant="rounded" className="h-10 w-[200px]" />
            <Skeleton variant="rounded" className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/50 overflow-hidden rounded-lg shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton variant="rounded" className="h-10 w-10" />
                  <Skeleton variant="rounded" className="h-6 w-20" />
                </div>
                <Skeleton variant="text" className="h-7 w-36 rounded-md" />
                <Skeleton variant="text" className="h-3 w-28 mt-1 rounded" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between py-4 border-y border-border/30">
                  <div className="space-y-0.5">
                    <Skeleton variant="text" className="h-3 w-14 rounded" />
                    <Skeleton variant="text" className="h-6 w-6 rounded" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <Skeleton variant="text" className="h-3 w-10 rounded" />
                    <Skeleton variant="text" className="h-5 w-16 rounded" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Skeleton variant="rounded" className="h-8 flex-1" />
                  <Skeleton variant="rounded" className="h-8 flex-1" />
                  <Skeleton variant="rounded" className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
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
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Menus</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Manage menus for your restaurants ({currentRestaurantMenus.length}/4)
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={selectedRestaurantId || ''}
            onValueChange={handleRestaurantChange}
          >
            <SelectTrigger className="w-[200px] border-border/50 font-medium text-sm">
              <SelectValue placeholder="Select restaurant" />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-sm">
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} disabled={!selectedRestaurantId} className="h-10 px-6 font-bold shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Menu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl w-full border border-border shadow-md rounded-lg p-0 overflow-hidden">
              <div className="p-8 border-b border-border/30 bg-muted/50">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {editingMenu ? 'Edit Menu' : 'Create New Menu'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {editingMenu
                    ? 'Update menu information and visibility settings.'
                    : 'Add a new menu to your restaurant. Maximum 4 per establishment.'}
                </DialogDescription>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <MultiLanguageInput
                  label="Menu Name"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  languages={languages}
                  defaultLanguage={selectedRestaurant?.defaultLanguage || 'ENG'}
                  placeholder="e.g. Dinner Menu"
                  showTranslate={true}
                />
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
                    placeholder="dinner-menu"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    URL-friendly identifier unique to this restaurant
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menuType" className="text-sm font-semibold">Menu Type</Label>
                  <Select
                    value={formData.menuType}
                    onValueChange={(value) => setFormData({ ...formData, menuType: value })}
                  >
                    <SelectTrigger className="bg-white border-input/50">
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
                    {editingMenu ? 'Save Changes' : 'Create Menu'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentRestaurantMenus.map((menu) => (
          <Card
            key={menu.id}
            className="group border-border/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden rounded-lg shadow-sm"
            onClick={() => handleSelectMenu(menu)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-muted border border-border/50 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                {menu.status === 'published' ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
                    <CheckCircle className="h-3 w-3" />
                    Published
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                    <XCircle className="h-3 w-3" />
                    Draft
                  </div>
                )}
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {menu.name[selectedRestaurant?.defaultLanguage || 'ENG'] || 'Untitled Menu'}
              </CardTitle>
              <CardDescription className="font-medium text-[10px] uppercase tracking-widest text-muted-foreground pt-1 opacity-60">
                {menu.slug} • {menu.menuType}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between py-4 border-y border-border/30">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Sections</span>
                  <p className="text-lg font-bold text-foreground">{menu._count?.sections || 0}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Type</span>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {menu.menuType}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-[10px] font-bold border border-border/50 hover:bg-muted h-8 uppercase tracking-tight"
                  onClick={() => handleSelectMenu(menu)}
                >
                  <Edit className="h-3.5 w-3.5 mr-2 text-primary" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-[10px] font-bold border border-border/50 hover:bg-muted h-8 uppercase tracking-tight"
                  onClick={() => handleDuplicate(menu)}
                >
                  <Copy className="h-3.5 w-3.5 mr-2 text-primary" />
                  Copy
                </Button>
                {menu.status === 'draft' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-[10px] font-bold border border-primary/20 bg-primary/5 hover:bg-primary hover:text-primary-foreground h-8 uppercase tracking-tight text-primary transition-all"
                    onClick={() => handlePublish(menu)}
                  >
                    Publish
                  </Button>
                )}
                {menu.status === 'published' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-bold border border-border/50 hover:bg-muted h-8 px-3 uppercase tracking-tight"
                      onClick={() => handleRepublish(menu)}
                      title="Sync and Republish"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-bold border border-border/50 hover:bg-muted h-8 px-3 uppercase tracking-tight"
                      onClick={() => handleCopyLink(menu)}
                      title="Copy Menu Link"
                    >
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] font-bold border border-border/50 hover:bg-red-50 hover:text-red-600 h-8 px-3 uppercase tracking-tight"
                  onClick={() => handleDelete(menu.id)}
                  title="Delete Menu"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentRestaurantMenus.length === 0 && selectedRestaurantId && (
        <Card className="bg-surface/20 border-dashed border-2 flex flex-col items-center justify-center p-20 text-center">
          <div className="p-6 rounded-md bg-surface border border-input text-muted-foreground mb-6 shadow-sm">
            <BookOpen className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create your first menu</CardTitle>
          <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed font-medium">
            Start structuring your digital menu by adding titles, sections, and items.
          </p>
          <Button size="lg" className="mt-8 px-10 h-12 text-base font-bold shadow-lg shadow-primary/20" onClick={() => handleOpenDialog()}>
            <Plus className="h-5 w-5 mr-3" />
            Get Started
          </Button>
        </Card>
      )}

      {/* Publish Dialog with Template Selection */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-lg w-full border border-border shadow-md rounded-lg p-0 overflow-hidden">
          <div className="p-8 border-b border-border/30 bg-muted/50">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {publishingMenu?.status === 'published' ? 'Republish Menu' : 'Ready to Publish?'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Select a template below to define the look of your live digital menu.
            </DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={(template) => setSelectedTemplateId(template.id)}
              onPreview={(template) => {
                setPreviewTemplateSlug(template.slug);
                setPreviewOpen(true);
              }}
            />
            <div className="flex justify-end gap-3 pt-6 border-t border-input/20">
              <Button 
                variant="ghost" 
                onClick={() => setPublishDialogOpen(false)}
                className="h-10 px-6 font-medium"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmPublish} className="h-10 px-8 font-bold shadow-sm">
                {publishingMenu?.status === 'published' ? 'Sync & Republish' : 'Go Live Now'}
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

