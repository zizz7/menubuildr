'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Palette, Save, Eye, Upload, Image as ImageIcon, RefreshCw, Smartphone, Monitor, X, Code, Settings, Type, Image, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { DEFAULT_COLOR_PALETTE } from '@/lib/constants/color-palette';
import { getServerUrl, resolveAssetUrl } from '@/lib/utils';
import { TemplateSelector } from '@/components/theme/template-selector';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ThemeSettings {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  customCss?: string;
  customFontsUrls: string[];
  backgroundIllustrationUrl?: string;
  backgroundIllustrationOpacity?: number; // 0-100 percentage
  navDrawerStyle?: string; // 'cards' | 'plain'
  navDrawerBgUrl?: string;
  navDrawerBgOpacity?: number; // 0-100 percentage
  navDrawerCategoryImages?: Record<string, string>; // sectionId -> imageUrl
  coverPhotoUrl?: string;
  coverPhotoPosition?: string;
  coverPhotoSize?: string;
  logoSize?: number; // Logo size multiplier (percentage or pixels)
  sectionFontFamily?: string; // Font family for section titles
  sectionFontSize?: number; // Font size for section titles (in em)
  sectionBackgroundColor?: string; // Background color for menu sections
}

export default function ThemePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants, selectedRestaurant, setSelectedRestaurant } = useRestaurantStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [republishing, setRepublishing] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [menuData, setMenuData] = useState<any>(null);
  const [allergens, setAllergens] = useState<any[]>([]);
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverPhotoInputMode, setCoverPhotoInputMode] = useState<'upload' | 'url'>('url');
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const [previewView, setPreviewView] = useState<'mobile' | 'desktop'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('colors');
  const [sectionIllustrations, setSectionIllustrations] = useState<Record<string, {
    illustrationUrl: string;
    illustrationAsBackground: boolean;
    illustrationPosition: string;
    illustrationSize: string;
    inputMode: 'upload' | 'url';
    uploading: boolean;
  }>>({});
  const [bgIllustrationInputMode, setBgIllustrationInputMode] = useState<'upload' | 'url'>('url');
  const [bgIllustrationUploading, setBgIllustrationUploading] = useState(false);
  const [navDrawerBgInputMode, setNavDrawerBgInputMode] = useState<'upload' | 'url'>('url');
  const [navDrawerBgUploading, setNavDrawerBgUploading] = useState(false);
  const [categoryImageModes, setCategoryImageModes] = useState<Record<string, 'upload' | 'url'>>({});
  const [categoryImageUploading, setCategoryImageUploading] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<ThemeSettings>({
    id: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#ff6b6b',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    customCss: '',
    customFontsUrls: [],
    backgroundIllustrationUrl: '',
    backgroundIllustrationOpacity: 30,
    navDrawerStyle: 'cards',
    navDrawerBgUrl: '',
    navDrawerBgOpacity: 30,
    navDrawerCategoryImages: {},
    coverPhotoUrl: '',
    logoSize: 100, // Default 100% (normal size)
    sectionFontFamily: 'Eastwood, serif', // Default section font
    sectionFontSize: 2, // Default 2em
    sectionBackgroundColor: '#ffffff', // Default white for section background
  });
  const [newFontUrl, setNewFontUrl] = useState('');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'card'>('primary');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

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
          const { setRestaurants, setSelectedRestaurant } = useRestaurantStore.getState();
          setRestaurants(response.data);
          
          if (response.data.length > 0) {
            setSelectedRestaurantId(response.data[0].id);
            setSelectedRestaurant(response.data[0]);
            await fetchTheme(response.data[0].id);
          } else {
            setLoading(false);
          }
        } else {
          // Restaurants already loaded
          if (selectedRestaurant) {
            setSelectedRestaurantId(selectedRestaurant.id);
            await fetchTheme(selectedRestaurant.id);
          } else if (restaurants.length > 0) {
            setSelectedRestaurantId(restaurants[0].id);
            setSelectedRestaurant(restaurants[0]);
            await fetchTheme(restaurants[0].id);
          } else {
            setLoading(false);
          }
        }
      } catch (error: any) {
        console.error('Failed to load restaurants:', error);
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('ECONNREFUSED')) {
          toast.error('Cannot connect to server. Please ensure the backend server is running on port 5000.');
          console.error('Backend server is not running. Please start it with: cd server && npm run dev');
        } else {
          toast.error('Failed to load restaurants: ' + (error.response?.data?.error || error.message || 'Unknown error'));
        }
        setLoading(false);
      }
    };

    loadData();
    fetchAllergens();
  }, [selectedRestaurant, restaurants.length]);

  // Update preview when formData or selectedMenuId changes (debounced)
  useEffect(() => {
    if (!selectedMenuId) {
      setPreviewUrl('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        // Create a blob URL from the preview HTML
        const response = await apiClient.post(
          `/menus/${selectedMenuId}/preview`,
          { theme: formData, templateId: selectedTemplateId },
          { responseType: 'blob' }
        );
        
        const blob = new Blob([response.data], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        // Revoke old URL if exists
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(url);
        setPreviewKey(prev => prev + 1);
      } catch (error) {
        console.error('Failed to generate preview:', error);
      } finally {
        setPreviewLoading(false);
      }
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(timer);
    };
  }, [formData, selectedMenuId, selectedTemplateId]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchMenus = async (restaurantId: string) => {
    try {
      const response = await apiClient.get(`/menus/restaurant/${restaurantId}`);
      setMenus(response.data);
      if (response.data.length > 0 && !selectedMenuId) {
        const firstMenuId = response.data[0].id;
        setSelectedMenuId(firstMenuId);
        await fetchMenuData(firstMenuId);
      }
    } catch (error) {
      console.error('Failed to fetch menus:', error);
      setMenus([]);
    }
  };

  const fetchAllergens = async () => {
    try {
      const response = await apiClient.get('/allergens');
      setAllergens(response.data || []);
    } catch (error) {
      console.error('Failed to fetch allergens:', error);
      setAllergens([]);
    }
  };

  const fetchMenuData = async (menuId: string) => {
    try {
      const response = await apiClient.get(`/menus/${menuId}`);
      setMenuData(response.data);
      
      // Load template ID from menu data
      if (response.data.templateId) {
        setSelectedTemplateId(response.data.templateId);
      } else {
        setSelectedTemplateId(null);
      }
      
      // Load menu-specific theme if available
      if (response.data.themeSettings) {
        const menuTheme = response.data.themeSettings;
        setFormData({
          id: '',
          primaryColor: menuTheme.primaryColor || '#000000',
          secondaryColor: menuTheme.secondaryColor || '#ffffff',
          accentColor: menuTheme.accentColor || '#ff6b6b',
          backgroundColor: menuTheme.backgroundColor || '#ffffff',
          textColor: menuTheme.textColor || '#000000',
          customCss: menuTheme.customCss || '',
          customFontsUrls: menuTheme.customFontsUrls || [],
          backgroundIllustrationUrl: menuTheme.backgroundIllustrationUrl || '',
          backgroundIllustrationOpacity: menuTheme.backgroundIllustrationOpacity ?? 30,
          navDrawerStyle: menuTheme.navDrawerStyle || 'cards',
          navDrawerBgUrl: menuTheme.navDrawerBgUrl || '',
          navDrawerBgOpacity: menuTheme.navDrawerBgOpacity ?? 30,
          navDrawerCategoryImages: menuTheme.navDrawerCategoryImages || {},
          coverPhotoUrl: menuTheme.coverPhotoUrl || '',
          coverPhotoPosition: menuTheme.coverPhotoPosition || 'center',
          coverPhotoSize: menuTheme.coverPhotoSize || 'cover',
          logoSize: menuTheme.logoSize || 100,
          sectionFontFamily: menuTheme.sectionFontFamily || 'Eastwood, serif',
          sectionFontSize: menuTheme.sectionFontSize || 2,
          sectionBackgroundColor: menuTheme.sectionBackgroundColor || '#ffffff',
        });
        // Set input mode based on cover photo URL
        if (menuTheme.coverPhotoUrl) {
          const isUploaded = !menuTheme.coverPhotoUrl.startsWith('http');
          setCoverPhotoInputMode(isUploaded ? 'upload' : 'url');
        }
        if (menuTheme.backgroundIllustrationUrl) {
          const isUploaded = !menuTheme.backgroundIllustrationUrl.startsWith('http');
          setBgIllustrationInputMode(isUploaded ? 'upload' : 'url');
        }
        setTheme(menuTheme as ThemeSettings);
      }
      
      // Load section illustrations with existing settings
      if (response.data.sections && Array.isArray(response.data.sections)) {
        const illustrations: Record<string, {
          illustrationUrl: string;
          illustrationAsBackground: boolean;
          illustrationPosition: string;
          illustrationSize: string;
          inputMode: 'upload' | 'url';
          uploading: boolean;
        }> = {};
        
        response.data.sections.forEach((section: any) => {
          const hasUrl = section.illustrationUrl && section.illustrationUrl.trim();
          const isUploaded = hasUrl && !hasUrl.startsWith('http');
          
          illustrations[section.id] = {
            illustrationUrl: section.illustrationUrl || '',
            illustrationAsBackground: section.illustrationAsBackground || false,
            illustrationPosition: section.illustrationPosition || 'center',
            illustrationSize: section.illustrationSize || 'fit',
            inputMode: hasUrl && !isUploaded ? 'url' : 'upload',
            uploading: false,
          };
        });
        
        setSectionIllustrations(illustrations);
      }
      
      // Fetch allergens for legend preview
      await fetchAllergens();
    } catch (error) {
      console.error('Failed to fetch menu data:', error);
      setMenuData(null);
    }
  };

  const fetchTheme = async (restaurantId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/restaurants/${restaurantId}`);
      
      // Set logo URL
      setLogoUrl(response.data.logoUrl || '');
      
      // If a menu is selected, check if it has menu-specific theme
      // Otherwise, use restaurant theme as fallback
      if (selectedMenuId && menuData?.themeSettings) {
        // Menu-specific theme already loaded in fetchMenuData
        return;
      }
      
      // Load restaurant theme (fallback or default)
      if (response.data.themeSettings) {
        setTheme(response.data.themeSettings);
        setFormData({
          ...response.data.themeSettings,
          customCss: response.data.themeSettings.customCss || '',
          customFontsUrls: response.data.themeSettings.customFontsUrls || [],
          backgroundIllustrationUrl: response.data.themeSettings.backgroundIllustrationUrl || '',
          backgroundIllustrationOpacity: response.data.themeSettings.backgroundIllustrationOpacity ?? 30,
          navDrawerStyle: response.data.themeSettings.navDrawerStyle || 'cards',
          navDrawerBgUrl: response.data.themeSettings.navDrawerBgUrl || '',
          navDrawerBgOpacity: response.data.themeSettings.navDrawerBgOpacity ?? 30,
          navDrawerCategoryImages: response.data.themeSettings.navDrawerCategoryImages || {},
          coverPhotoUrl: response.data.themeSettings.coverPhotoUrl || '',
          coverPhotoPosition: response.data.themeSettings.coverPhotoPosition || 'center',
          coverPhotoSize: response.data.themeSettings.coverPhotoSize || 'cover',
          logoSize: response.data.themeSettings.logoSize || 100,
          sectionFontFamily: response.data.themeSettings.sectionFontFamily || 'Eastwood, serif',
          sectionFontSize: response.data.themeSettings.sectionFontSize || 2,
          sectionBackgroundColor: response.data.themeSettings.sectionBackgroundColor || '#ffffff',
        });
        // Set input mode based on cover photo URL
        if (response.data.themeSettings.coverPhotoUrl) {
          const isUploaded = !response.data.themeSettings.coverPhotoUrl.startsWith('http');
          setCoverPhotoInputMode(isUploaded ? 'upload' : 'url');
        }
        if (response.data.themeSettings.backgroundIllustrationUrl) {
          const isUploaded = !response.data.themeSettings.backgroundIllustrationUrl.startsWith('http');
          setBgIllustrationInputMode(isUploaded ? 'upload' : 'url');
        }
      } else {
        // Create default theme
        const defaultTheme = {
          id: '',
          primaryColor: '#000000',
          secondaryColor: '#ffffff',
          accentColor: '#ff6b6b',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          customCss: '',
          customFontsUrls: [],
          backgroundIllustrationUrl: '',
          coverPhotoUrl: '',
        };
        setFormData(defaultTheme);
      }
      
      // Fetch menus for this restaurant
      await fetchMenus(restaurantId);
    } catch (error) {
      toast.error('Failed to fetch theme settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setSelectedMenuId(null);
    setMenuData(null);
    const restaurant = restaurants.find((r) => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
    }
    fetchTheme(restaurantId);
  };

  const handleMenuChange = async (menuId: string) => {
    setSelectedMenuId(menuId);
    await fetchMenuData(menuId);
  };

  const handleSectionIllustrationUpload = async (sectionId: string, file: File) => {
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (PNG, SVG, JPEG, or WebP)');
      return;
    }

    setSectionIllustrations(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {
          illustrationUrl: '',
          illustrationAsBackground: false,
          illustrationPosition: 'center',
          illustrationSize: 'fit',
          inputMode: 'upload' as const,
          uploading: false,
        }),
        uploading: true,
      },
    }));

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('illustration', file);

      const response = await apiClient.post('/upload/illustration', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Use URL as-is if it's already a full URL (Cloudinary), otherwise construct full URL
      const url = response.data.url;
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `${getServerUrl()}${url}`;

      setSectionIllustrations(prev => ({
        ...prev,
        [sectionId]: {
          ...(prev[sectionId] || {
            illustrationUrl: '',
            illustrationAsBackground: false,
            illustrationPosition: 'center',
            illustrationSize: 'fit',
            inputMode: 'upload' as const,
            uploading: false,
          }),
          illustrationUrl: fullUrl,
          uploading: false,
        },
      }));

      toast.success('Illustration uploaded successfully');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to upload illustration';
      toast.error(errorMsg);
      setSectionIllustrations(prev => ({
        ...prev,
        [sectionId]: {
          ...(prev[sectionId] || {
            illustrationUrl: '',
            illustrationAsBackground: false,
            illustrationPosition: 'center',
            illustrationSize: 'fit',
            inputMode: 'upload' as const,
            uploading: false,
          }),
          uploading: false,
        },
      }));
    }
  };

  const handleCoverPhotoUpload = async (file: File) => {
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (PNG, SVG, JPEG, or WebP)');
      return;
    }

    setCoverPhotoUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('illustration', file);

      const response = await apiClient.post('/upload/illustration', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Use URL as-is if it's already a full URL (Cloudinary), otherwise construct full URL
      const url = response.data.url;
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `${getServerUrl()}${url}`;

      setFormData({ ...formData, coverPhotoUrl: fullUrl });
      toast.success('Cover photo uploaded successfully');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to upload cover photo';
      toast.error(errorMsg);
    } finally {
      setCoverPhotoUploading(false);
    }
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

      setLogoUrl(response.data.url);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRestaurantId) {
      toast.error('Please select a restaurant');
      return;
    }

    if (!selectedMenuId) {
      toast.error('Please select a menu');
      return;
    }

    try {
      setSaving(true);
      
      // Update theme settings with menuId to save per menu
      const themeData = {
        ...formData,
        menuId: selectedMenuId, // Include menuId to save theme per menu
        templateId: selectedTemplateId, // Include templateId to save template selection
      };
      await apiClient.put(`/restaurants/${selectedRestaurantId}/theme`, themeData);
      
      // Update logo if changed
      if (logoUrl !== undefined) {
        await apiClient.put(`/restaurants/${selectedRestaurantId}`, {
          logoUrl: logoUrl || null,
        });
      }
      
      // Update section illustrations
      if (menuData?.sections) {
        const updatePromises = menuData.sections.map((section: any) => {
          const illustration = sectionIllustrations[section.id];
          if (illustration) {
            // Clean up illustrationUrl - convert empty string to null
            const illustrationUrl = illustration.illustrationUrl?.trim() || null;
            return apiClient.put(`/sections/${section.id}`, {
              illustrationUrl: illustrationUrl,
              illustrationAsBackground: illustration.illustrationAsBackground,
              illustrationPosition: illustration.illustrationPosition || null,
              illustrationSize: illustration.illustrationSize || null,
            });
          }
          return Promise.resolve();
        });
        await Promise.all(updatePromises);
      }
      
      toast.success('Theme settings and section backgrounds saved');
      
      // Refresh menu data to get updated sections
      await fetchMenuData(selectedMenuId);
      
      // Republish selected menu
      await handleRepublish();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const handleRepublish = async () => {
    if (!selectedMenuId) {
      toast.error('Please select a menu to republish');
      return;
    }

    try {
      setRepublishing(true);
      await apiClient.post(`/menus/${selectedMenuId}/publish`);
      toast.success('Menu republished successfully with new theme');
      fetchTheme(selectedRestaurantId!);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to republish menu');
    } finally {
      setRepublishing(false);
    }
  };

  const handleAddFont = () => {
    if (newFontUrl && !formData.customFontsUrls.includes(newFontUrl)) {
      setFormData({
        ...formData,
        customFontsUrls: [...formData.customFontsUrls, newFontUrl],
      });
      setNewFontUrl('');
    }
  };

  const handleRemoveFont = (index: number) => {
    setFormData({
      ...formData,
      customFontsUrls: formData.customFontsUrls.filter((_, i) => i !== index),
    });
  };

  const previewStyle = {
    '--primary-color': formData.primaryColor,
    '--secondary-color': formData.secondaryColor,
    '--accent-color': formData.accentColor,
    '--background-color': formData.backgroundColor,
    '--text-color': formData.textColor,
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="text" className="h-9 w-52 rounded-md" />
            <Skeleton variant="text" className="h-5 w-64 mt-2 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton variant="rounded" className="h-10 w-[200px]" />
            <Skeleton variant="rounded" className="h-10 w-[200px]" />
            <Skeleton variant="rounded" className="h-10 w-40" />
          </div>
        </div>
        <Skeleton variant="rounded" className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton variant="rounded" className="h-10 w-full max-w-lg" />
            <Card>
              <CardHeader>
                <Skeleton variant="text" className="h-6 w-32 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton variant="rounded" className="h-10 w-10" />
                    <Skeleton variant="text" className="h-4 w-24 rounded" />
                    <Skeleton variant="rounded" className="h-10 flex-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton variant="text" className="h-6 w-28 rounded-md" />
              </CardHeader>
              <CardContent>
                <Skeleton variant="rounded" className="h-[400px] w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
            <p className="text-gray-600 text-center mb-4">
              Create a restaurant first to customize themes
            </p>
            <Button onClick={() => router.push('/dashboard/restaurants')}>
              Go to Restaurants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Theme Customization</h1>
          <p className="text-gray-600 mt-2">Customize colors, fonts, and styling</p>
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
          {selectedRestaurantId && menus.length > 0 && (
            <Select
              value={selectedMenuId || ''}
              onValueChange={handleMenuChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select menu" />
              </SelectTrigger>
              <SelectContent>
                {menus.map((m) => {
                  const menuName = typeof m.name === 'object' && m.name !== null
                    ? (m.name.ENG || Object.values(m.name)[0] || 'Unnamed Menu')
                    : (m.name || 'Unnamed Menu');
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      {menuName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleSave} disabled={saving || republishing}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : republishing ? 'Republishing...' : 'Save & Republish'}
          </Button>
        </div>
      </div>

      {/* Template Selector Row */}
      {selectedRestaurantId && selectedMenuId && (
        <div className="mb-6">
          <div className="max-w-xs">
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={(templateId) => setSelectedTemplateId(templateId)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Theme Settings */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="colors">
                <Palette className="h-4 w-4 mr-2" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="css-fonts">
                <Code className="h-4 w-4 mr-2" />
                CSS & Fonts
              </TabsTrigger>
              <TabsTrigger value="logo">
                <Image className="h-4 w-4 mr-2" />
                Logo
              </TabsTrigger>
              <TabsTrigger value="sections">
                <ImageIcon className="h-4 w-4 mr-2" />
                Section Backgrounds
              </TabsTrigger>
              <TabsTrigger value="background">
                <Image className="h-4 w-4 mr-2" />
                Background
              </TabsTrigger>
              <TabsTrigger value="nav-drawer">
                <Settings className="h-4 w-4 mr-2" />
                Nav Drawer
              </TabsTrigger>
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Set your color scheme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Color Palette */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Color Palette</Label>
                <Select value={colorTarget} onValueChange={(value: any) => setColorTarget(value)}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Color</SelectItem>
                    <SelectItem value="secondary">Secondary Color</SelectItem>
                    <SelectItem value="accent">Accent Color</SelectItem>
                    <SelectItem value="background">Background Color</SelectItem>
                    <SelectItem value="text">Text Color</SelectItem>
                    <SelectItem value="card">Card Background</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-4 border rounded-lg bg-gray-50">
                {DEFAULT_COLOR_PALETTE.map((color) => (
                  <div
                    key={color.hex}
                    className="group relative"
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        // Copy to clipboard
                        try {
                          await navigator.clipboard.writeText(color.hex);
                          setCopiedColor(color.hex);
                          toast.success(`Copied ${color.hex} to clipboard`);
                          setTimeout(() => setCopiedColor(null), 2000);
                        } catch (err) {
                          toast.error('Failed to copy color');
                        }
                      }}
                      className="w-full aspect-square rounded-lg border-2 border-gray-300 hover:border-gray-500 transition-all hover:scale-105 shadow-sm hover:shadow-md relative overflow-hidden"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.name} - ${color.hex} (Click to copy)`}
                    >
                      {copiedColor === color.hex && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-10 flex items-center justify-center">
                        <Copy className="h-4 w-4 text-white drop-shadow-lg" />
                      </div>
                    </button>
                    <div className="mt-1 text-center">
                      <p className="text-xs font-medium text-gray-700 truncate">{color.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{color.hex}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (colorTarget === 'card') {
                          // Apply to card background via custom CSS
                          const customCss = formData.customCss || '';
                          const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*background:\s*[^;]+;?/g, '')
                            .replace(/\.menu-item\s*\{/g, `.menu-item { background: ${color.hex} !important; `);
                          if (!updatedCss.includes('.menu-item {')) {
                            setFormData({ ...formData, customCss: `${customCss}\n.menu-item { background: ${color.hex} !important; }` });
                          } else {
                            setFormData({ ...formData, customCss: updatedCss });
                          }
                          toast.success(`Applied ${color.name} to card background`);
                        } else {
                          // Apply to selected target
                          const updates: any = {};
                          updates[`${colorTarget}Color`] = color.hex;
                          setFormData({ ...formData, ...updates });
                          toast.success(`Applied ${color.name} to ${colorTarget} color`);
                        }
                      }}
                      className="mt-1 w-full text-xs py-1 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Copy className="h-3 w-3" />
                <span>Click a color to copy its hex code, or use "Apply" to set it as the selected color type</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData({ ...formData, accentColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData({ ...formData, accentColor: e.target.value })
                  }
                  placeholder="#ff6b6b"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    setFormData({ ...formData, backgroundColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    setFormData({ ...formData, backgroundColor: e.target.value })
                  }
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textColor">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  id="textColor"
                  type="color"
                  value={formData.textColor}
                  onChange={(e) =>
                    setFormData({ ...formData, textColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.textColor}
                  onChange={(e) =>
                    setFormData({ ...formData, textColor: e.target.value })
                  }
                  placeholder="#000000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Customization Options */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Customization</CardTitle>
            <CardDescription>Fine-tune the appearance of menu elements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardBorderRadius">Card Border Radius</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="cardBorderRadius"
                    type="range"
                    min="0"
                    max="20"
                    defaultValue="8"
                    className="flex-1"
                    onChange={(e) => {
                      const value = e.target.value;
                      const customCss = formData.customCss || '';
                      // Update or add border-radius to custom CSS
                      const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*border-radius:\s*[^;]+;?/g, '')
                        .replace(/\.menu-item\s*\{/g, `.menu-item { border-radius: ${value}px; `);
                      if (!updatedCss.includes('.menu-item {')) {
                        setFormData({ ...formData, customCss: `${customCss}\n.menu-item { border-radius: ${value}px; }` });
                      } else {
                        setFormData({ ...formData, customCss: updatedCss });
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500 w-12 text-right">px</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardPadding">Card Padding</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="cardPadding"
                    type="range"
                    min="10"
                    max="40"
                    defaultValue="20"
                    className="flex-1"
                    onChange={(e) => {
                      const value = e.target.value;
                      const customCss = formData.customCss || '';
                      const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*padding:\s*[^;]+;?/g, '')
                        .replace(/\.menu-item\s*\{/g, `.menu-item { padding: ${value}px; `);
                      if (!updatedCss.includes('.menu-item {')) {
                        setFormData({ ...formData, customCss: `${customCss}\n.menu-item { padding: ${value}px; }` });
                      } else {
                        setFormData({ ...formData, customCss: updatedCss });
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500 w-12 text-right">px</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardShadow">Card Shadow Intensity</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="cardShadow"
                    type="range"
                    min="0"
                    max="20"
                    defaultValue="4"
                    className="flex-1"
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const customCss = formData.customCss || '';
                      const shadowValue = `0 ${value/2}px ${value}px rgba(0, 0, 0, ${value/40})`;
                      const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*box-shadow:\s*[^;]+;?/g, '')
                        .replace(/\.menu-item\s*\{/g, `.menu-item { box-shadow: ${shadowValue}; `);
                      if (!updatedCss.includes('.menu-item {')) {
                        setFormData({ ...formData, customCss: `${customCss}\n.menu-item { box-shadow: ${shadowValue}; }` });
                      } else {
                        setFormData({ ...formData, customCss: updatedCss });
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500 w-12 text-right">px</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemGap">Item Spacing</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="itemGap"
                    type="range"
                    min="10"
                    max="40"
                    defaultValue="20"
                    className="flex-1"
                    onChange={(e) => {
                      const value = e.target.value;
                      const customCss = formData.customCss || '';
                      const updatedCss = customCss.replace(/\.menu-items\s*\{[^}]*gap:\s*[^;]+;?/g, '')
                        .replace(/\.menu-items\s*\{/g, `.menu-items { gap: ${value}px; `);
                      if (!updatedCss.includes('.menu-items {')) {
                        setFormData({ ...formData, customCss: `${customCss}\n.menu-items { gap: ${value}px; }` });
                      } else {
                        setFormData({ ...formData, customCss: updatedCss });
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500 w-12 text-right">px</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label htmlFor="sectionTitleSize">Section Title Size</Label>
              <div className="flex gap-2 items-center mt-2">
                <Input
                  id="sectionTitleSize"
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  defaultValue="2"
                  className="flex-1"
                  onChange={(e) => {
                    const value = e.target.value;
                    const customCss = formData.customCss || '';
                    const updatedCss = customCss.replace(/\.section-title\s*\{[^}]*font-size:\s*[^;]+;?/g, '')
                      .replace(/\.section-title\s*\{/g, `.section-title { font-size: ${value}em; `);
                    if (!updatedCss.includes('.section-title {')) {
                      setFormData({ ...formData, customCss: `${customCss}\n.section-title { font-size: ${value}em; }` });
                    } else {
                      setFormData({ ...formData, customCss: updatedCss });
                    }
                  }}
                />
                <span className="text-sm text-gray-500 w-12 text-right">em</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label htmlFor="cardBackgroundColor">Card Background Color</Label>
              <div className="flex gap-2 items-center mt-2">
                <Input
                  id="cardBackgroundColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    setFormData({ ...formData, secondaryColor: color });
                    // Also update custom CSS to apply to menu items
                    const customCss = formData.customCss || '';
                    const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*background:\s*[^;]+;?/g, '')
                      .replace(/\.menu-item\s*\{/g, `.menu-item { background: ${color} !important; `);
                    if (!updatedCss.includes('.menu-item {')) {
                      setFormData({ ...formData, customCss: `${customCss}\n.menu-item { background: ${color} !important; }` });
                    } else {
                      setFormData({ ...formData, customCss: updatedCss });
                    }
                  }}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
                      setFormData({ ...formData, secondaryColor: color });
                      // Also update custom CSS
                      const customCss = formData.customCss || '';
                      const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*background:\s*[^;]+;?/g, '')
                        .replace(/\.menu-item\s*\{/g, `.menu-item { background: ${color} !important; `);
                      if (!updatedCss.includes('.menu-item {')) {
                        setFormData({ ...formData, customCss: `${customCss}\n.menu-item { background: ${color} !important; }` });
                      } else {
                        setFormData({ ...formData, customCss: updatedCss });
                      }
                    }
                  }}
                  placeholder="#ffffff"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Quick apply from palette
                    const customCss = formData.customCss || '';
                    const updatedCss = customCss.replace(/\.menu-item\s*\{[^}]*background:\s*[^;]+;?/g, '')
                      .replace(/\.menu-item\s*\{/g, `.menu-item { background: ${formData.secondaryColor} !important; `);
                    if (!updatedCss.includes('.menu-item {')) {
                      setFormData({ ...formData, customCss: `${customCss}\n.menu-item { background: ${formData.secondaryColor} !important; }` });
                    } else {
                      setFormData({ ...formData, customCss: updatedCss });
                    }
                    toast.success('Card background color applied');
                  }}
                >
                  Apply
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Change the background color of menu item cards (default: white)
              </p>
            </div>

            <div className="pt-4 border-t">
              <Label htmlFor="sectionBackgroundColor">Menu Section Background Color</Label>
              <div className="flex gap-2 items-center mt-2">
                <Input
                  id="sectionBackgroundColor"
                  type="color"
                  value={formData.sectionBackgroundColor || '#ffffff'}
                  onChange={(e) => {
                    setFormData({ ...formData, sectionBackgroundColor: e.target.value });
                  }}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.sectionBackgroundColor || '#ffffff'}
                  onChange={(e) => {
                    const color = e.target.value;
                    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
                      setFormData({ ...formData, sectionBackgroundColor: color });
                    }
                  }}
                  placeholder="#ffffff"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Change the background color of menu sections (the area behind menu item cards). Background illustrations will still be visible on top of this color.
              </p>
            </div>
          </CardContent>
        </Card>

              {/* Cover Photo Section */}
        <Card>
          <CardHeader>
                  <CardTitle>Header Cover Photo</CardTitle>
                  <CardDescription>Set a cover photo for the menu header (replaces primary color background)</CardDescription>
          </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cover Photo (optional)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={coverPhotoInputMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoverPhotoInputMode('upload')}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant={coverPhotoInputMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoverPhotoInputMode('url')}
                      >
                        URL
                      </Button>
                    </div>
                  </div>

                  {coverPhotoInputMode === 'upload' ? (
                    <div className="space-y-3">
                      <Input
                        id="coverPhotoFile"
                        type="file"
                        accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleCoverPhotoUpload(file);
                          }
                        }}
                        className="w-full"
                        disabled={coverPhotoUploading}
                      />
                      {coverPhotoUploading && (
                        <p className="text-xs text-blue-500">Uploading cover photo...</p>
                      )}
                    </div>
                  ) : (
                    <Input
                      id="coverPhotoUrl"
                      type="url"
                      value={formData.coverPhotoUrl || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, coverPhotoUrl: e.target.value })
                      }
                      placeholder="https://example.com/cover-photo.jpg"
                    />
                  )}

                  {formData.coverPhotoUrl && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <Label>Preview</Label>
                      <div className="mt-3">
                        <div className="w-full h-32 border-2 border-gray-300 rounded bg-white overflow-hidden">
                          <img
                            src={resolveAssetUrl(formData.coverPhotoUrl)}
                            alt="Cover photo preview"
                            className="w-full h-full object-cover"
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
                        <div className="mt-2 flex items-center gap-2">
              <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, coverPhotoUrl: '' });
                              const fileInput = document.getElementById('coverPhotoFile') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear
              </Button>
            </div>
                      </div>
                    </div>
                  )}

                  {!formData.coverPhotoUrl && (
                    <p className="text-xs text-gray-500">
                      Leave empty to use primary color as header background
                    </p>
                  )}

                  {formData.coverPhotoUrl && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="coverPhotoPosition">Background Position</Label>
                        <Select
                          value={formData.coverPhotoPosition || 'center'}
                          onValueChange={(value: 'center' | 'left' | 'right' | 'top' | 'bottom') =>
                            setFormData({ ...formData, coverPhotoPosition: value })
                          }
                        >
                          <SelectTrigger id="coverPhotoPosition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coverPhotoSize">Background Size</Label>
                        <Select
                          value={formData.coverPhotoSize || 'cover'}
                          onValueChange={(value: 'cover' | 'contain' | 'fit' | 'fullscreen') =>
                            setFormData({ ...formData, coverPhotoSize: value })
                          }
                        >
                          <SelectTrigger id="coverPhotoSize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover">Cover</SelectItem>
                            <SelectItem value="contain">Contain</SelectItem>
                            <SelectItem value="fit">Fit</SelectItem>
                            <SelectItem value="fullscreen">Fullscreen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
          </CardContent>
        </Card>
            </TabsContent>

            {/* Custom CSS & Fonts Tab */}
            <TabsContent value="css-fonts" className="space-y-8">
        {/* Custom CSS */}
              <Card>
          <CardHeader>
            <CardTitle>Custom CSS</CardTitle>
            <CardDescription>Add custom CSS to override default styles</CardDescription>
          </CardHeader>
          <CardContent>
            <MonacoEditor
                    height="400px"
              language="css"
              value={formData.customCss || ''}
              onChange={(value) =>
                setFormData({ ...formData, customCss: value || '' })
              }
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </CardContent>
        </Card>

        {/* Custom Fonts */}
              <Card>
          <CardHeader>
            <CardTitle>Custom Fonts</CardTitle>
            <CardDescription>Add Google Fonts or custom font URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                value={newFontUrl}
                onChange={(e) => setNewFontUrl(e.target.value)}
                placeholder="https://fonts.googleapis.com/css2?family=..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddFont()}
              />
              <Button onClick={handleAddFont}>Add Font</Button>
            </div>
            {formData.customFontsUrls.length > 0 && (
              <div className="space-y-2">
                {formData.customFontsUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="text-sm truncate flex-1">{url}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFont(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Font Settings */}
              <Card>
          <CardHeader>
            <CardTitle>Section Font Settings</CardTitle>
            <CardDescription>Customize fonts and text size for section titles in the menu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sectionFontFamily">Section Font Family</Label>
              <Select
                value={formData.sectionFontFamily || 'Eastwood, serif'}
                onValueChange={(value) =>
                  setFormData({ ...formData, sectionFontFamily: value })
                }
              >
                <SelectTrigger id="sectionFontFamily">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eastwood, serif">Eastwood (Serif)</SelectItem>
                  <SelectItem value="'Mallory MP', sans-serif">Mallory MP (Sans-serif)</SelectItem>
                  <SelectItem value="'Lato', sans-serif">Lato (Sans-serif)</SelectItem>
                  <SelectItem value="'Playfair Display', serif">Playfair Display (Serif)</SelectItem>
                  <SelectItem value="'Roboto', sans-serif">Roboto (Sans-serif)</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans (Sans-serif)</SelectItem>
                  <SelectItem value="'Montserrat', sans-serif">Montserrat (Sans-serif)</SelectItem>
                  <SelectItem value="'Poppins', sans-serif">Poppins (Sans-serif)</SelectItem>
                  <SelectItem value="'Merriweather', serif">Merriweather (Serif)</SelectItem>
                  <SelectItem value="'Raleway', sans-serif">Raleway (Sans-serif)</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial (Sans-serif)</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia (Serif)</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman (Serif)</SelectItem>
                  <SelectItem value="'Courier New', monospace">Courier New (Monospace)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select the font family for section titles. Make sure to add the font URL in "Custom Fonts" above if using a Google Font.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sectionFontSize">Section Font Size</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="sectionFontSize"
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={formData.sectionFontSize || 2}
                  onChange={(e) =>
                    setFormData({ ...formData, sectionFontSize: parseFloat(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 w-16 text-right">
                  {formData.sectionFontSize || 2}em
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Adjust the text size for section titles (1em - 4em)
              </p>
            </div>
          </CardContent>
        </Card>
            </TabsContent>

            {/* Logo Tab */}
            <TabsContent value="logo" className="space-y-8">
              <Card>
          <CardHeader>
                  <CardTitle>Restaurant Logo</CardTitle>
                  <CardDescription>Set the logo that will appear in the generated menu</CardDescription>
          </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogoInputMode('upload')}
                    >
                      <Upload className="h-4 w-4 mr-2" />
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
                      {logoUrl && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label>Current Logo Preview</Label>
                            <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                              <img
                                src={resolveAssetUrl(logoUrl)}
                                alt="Logo preview"
                                className="object-contain"
                                style={{
                                  maxWidth: `${formData.logoSize || 100}%`,
                                  maxHeight: `${(formData.logoSize || 100) * 0.53}%`, // Maintain aspect ratio
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="logoSize">Logo Size</Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                id="logoSize"
                                type="range"
                                min="50"
                                max="200"
                                step="5"
                                value={formData.logoSize || 100}
                                onChange={(e) =>
                                  setFormData({ ...formData, logoSize: parseInt(e.target.value) })
                                }
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-500 w-16 text-right">
                                {formData.logoSize || 100}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Adjust the visual size of the logo (50% - 200% of default size)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
            <Input
              type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                      {logoUrl && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label>Logo Preview</Label>
                            <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                              <img
                                src={logoUrl}
                                alt="Logo preview"
                                className="object-contain"
                                style={{
                                  maxWidth: `${formData.logoSize || 100}%`,
                                  maxHeight: `${(formData.logoSize || 100) * 0.53}%`, // Maintain aspect ratio
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="logoSize">Logo Size</Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                id="logoSize"
                                type="range"
                                min="50"
                                max="200"
                                step="5"
                                value={formData.logoSize || 100}
                                onChange={(e) =>
                                  setFormData({ ...formData, logoSize: parseInt(e.target.value) })
                                }
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-500 w-16 text-right">
                                {formData.logoSize || 100}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Adjust the visual size of the logo (50% - 200% of default size)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Section Backgrounds Tab */}
            <TabsContent value="sections" className="space-y-8">
              {selectedMenuId && menuData?.sections && menuData.sections.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Section Background Illustrations</CardTitle>
                    <CardDescription>
                      Set background illustrations for each section in the selected menu
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                {menuData.sections.map((section: any) => {
                  const illustration = sectionIllustrations[section.id] || {
                    illustrationUrl: '',
                    illustrationAsBackground: false,
                    illustrationPosition: 'center',
                    illustrationSize: 'fit',
                    inputMode: 'url' as const,
                    uploading: false,
                  };
                  const sectionTitle = typeof section.title === 'object' && section.title !== null
                    ? (section.title.ENG || Object.values(section.title)[0] || 'Section')
                    : (section.title || 'Section');

                  return (
                    <div key={section.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">
                          {sectionTitle}
                        </Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Illustration (optional)</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={illustration.inputMode === 'upload' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setSectionIllustrations({
                                ...sectionIllustrations,
                                [section.id]: {
                                  ...illustration,
                                  inputMode: 'upload',
                                },
                              })
                            }
                          >
                            Upload
                          </Button>
                          <Button
                            type="button"
                            variant={illustration.inputMode === 'url' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setSectionIllustrations({
                                ...sectionIllustrations,
                                [section.id]: {
                                  ...illustration,
                                  inputMode: 'url',
                                },
                              })
                            }
                          >
                            URL
                          </Button>
                        </div>
                      </div>

                      {illustration.inputMode === 'upload' ? (
                        <div className="space-y-3">
                          <Input
                            id={`illustrationFile-${section.id}`}
                            type="file"
                            accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleSectionIllustrationUpload(section.id, file);
                              }
                            }}
                            className="w-full"
                            disabled={illustration.uploading}
                          />
                          {illustration.uploading && (
                            <p className="text-xs text-blue-500">Uploading illustration...</p>
                          )}
                        </div>
                      ) : (
                        <Input
                          id={`illustrationUrl-${section.id}`}
                          type="url"
                          value={illustration.illustrationUrl}
              onChange={(e) =>
                            setSectionIllustrations({
                              ...sectionIllustrations,
                              [section.id]: {
                                ...illustration,
                                illustrationUrl: e.target.value,
                              },
                            })
                          }
                          placeholder="https://example.com/illustration.svg"
                        />
                      )}

                      {illustration.illustrationUrl && (
                        <div className="p-4 border rounded-lg bg-gray-50">
                          <Label>Preview</Label>
                          <div className="mt-3 flex items-center gap-4">
                            <div
                              className="w-24 h-24 flex items-center justify-center border-2 border-gray-300 rounded bg-white overflow-hidden"
                              style={{ minWidth: '96px', minHeight: '96px' }}
                            >
                              <img
                                src={resolveAssetUrl(illustration.illustrationUrl)}
                                alt="Illustration preview"
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
                                {illustration.illustrationUrl}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSectionIllustrations({
                                      ...sectionIllustrations,
                                      [section.id]: {
                                        ...illustration,
                                        illustrationUrl: '',
                                      },
                                    });
                                    const fileInput = document.getElementById(`illustrationFile-${section.id}`) as HTMLInputElement;
                                    if (fileInput) fileInput.value = '';
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Clear
                                </Button>
                                {illustration.illustrationAsBackground && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    • Background: {illustration.illustrationPosition} • {illustration.illustrationSize === 'fit' ? 'Fit to Section' : 'Fullscreen'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!illustration.illustrationUrl && (
                        <p className="text-xs text-gray-500">
                          Leave empty if you don't have an illustration
                        </p>
                      )}

                      {illustration.illustrationUrl && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`illustrationAsBackground-${section.id}`}
                              checked={illustration.illustrationAsBackground}
                              onCheckedChange={(checked) =>
                                setSectionIllustrations({
                                  ...sectionIllustrations,
                                  [section.id]: {
                                    ...illustration,
                                    illustrationAsBackground: checked as boolean,
                                  },
                                })
                              }
                            />
                            <Label htmlFor={`illustrationAsBackground-${section.id}`} className="cursor-pointer">
                              Use as background
                            </Label>
                          </div>

                          {illustration.illustrationAsBackground && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor={`illustrationPosition-${section.id}`}>Background Position</Label>
                                <Select
                                  value={illustration.illustrationPosition}
                                  onValueChange={(value: 'center' | 'left' | 'right') =>
                                    setSectionIllustrations({
                                      ...sectionIllustrations,
                                      [section.id]: {
                                        ...illustration,
                                        illustrationPosition: value,
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger id={`illustrationPosition-${section.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`illustrationSize-${section.id}`}>Background Size</Label>
                                <Select
                                  value={illustration.illustrationSize}
                                  onValueChange={(value: 'fit' | 'fullscreen') =>
                                    setSectionIllustrations({
                                      ...sectionIllustrations,
                                      [section.id]: {
                                        ...illustration,
                                        illustrationSize: value,
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger id={`illustrationSize-${section.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fit">Fit to Section</SelectItem>
                                    <SelectItem value="fullscreen">Fullscreen</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
          </CardContent>
        </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No menu selected</h3>
                    <p className="text-gray-600 text-center">
                      Please select a menu to configure section backgrounds
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Background Illustration Tab */}
            <TabsContent value="background" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Menu Background Illustration</CardTitle>
                  <CardDescription>
                    Add a background illustration that appears behind the menu content with adjustable transparency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Background Illustration (optional)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={bgIllustrationInputMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBgIllustrationInputMode('upload')}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant={bgIllustrationInputMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBgIllustrationInputMode('url')}
                      >
                        URL
                      </Button>
                    </div>
                  </div>

                  {bgIllustrationInputMode === 'upload' ? (
                    <div className="space-y-3">
                      <Input
                        id="bgIllustrationFile"
                        type="file"
                        accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBgIllustrationUploading(true);
                            try {
                              const uploadFormData = new FormData();
                              uploadFormData.append('illustration', file);
                              const response = await apiClient.post('/upload/illustration', uploadFormData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              });
                              const url = response.data.url;
                              const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
                                ? url 
                                : `${getServerUrl()}${url}`;
                              setFormData({ ...formData, backgroundIllustrationUrl: fullUrl });
                              toast.success('Background illustration uploaded');
                            } catch (error: any) {
                              toast.error(error.response?.data?.error || 'Failed to upload');
                            } finally {
                              setBgIllustrationUploading(false);
                            }
                          }
                        }}
                        className="w-full"
                        disabled={bgIllustrationUploading}
                      />
                      {bgIllustrationUploading && (
                        <p className="text-xs text-blue-500">Uploading...</p>
                      )}
                    </div>
                  ) : (
                    <Input
                      type="url"
                      value={formData.backgroundIllustrationUrl || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, backgroundIllustrationUrl: e.target.value })
                      }
                      placeholder="https://example.com/background.png"
                    />
                  )}

                  {formData.backgroundIllustrationUrl && (
                    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                      <Label>Preview</Label>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-32 h-32 flex items-center justify-center border-2 border-gray-300 rounded bg-white overflow-hidden relative"
                          style={{ minWidth: '128px', minHeight: '128px' }}
                        >
                          <img
                            src={resolveAssetUrl(formData.backgroundIllustrationUrl)}
                            alt="Background illustration preview"
                            className="w-full h-full object-contain"
                            style={{ opacity: (formData.backgroundIllustrationOpacity ?? 30) / 100 }}
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
                            {formData.backgroundIllustrationUrl}
                          </p>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormData({ ...formData, backgroundIllustrationUrl: '' });
                                const fileInput = document.getElementById('bgIllustrationFile') as HTMLInputElement;
                                if (fileInput) fileInput.value = '';
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="bgIllustrationOpacity">Transparency</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="bgIllustrationOpacity"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.backgroundIllustrationOpacity ?? 30}
                            onChange={(e) =>
                              setFormData({ ...formData, backgroundIllustrationOpacity: parseInt(e.target.value) })
                            }
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-500 w-16 text-right">
                            {formData.backgroundIllustrationOpacity ?? 30}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          0% = fully transparent (invisible), 100% = fully opaque. Recommended: 15-40% for subtle backgrounds.
                        </p>
                      </div>
                    </div>
                  )}

                  {!formData.backgroundIllustrationUrl && (
                    <p className="text-xs text-gray-500">
                      Add a decorative background illustration that appears behind the menu content. Works with all templates.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nav Drawer Tab */}
            <TabsContent value="nav-drawer" className="space-y-8">
              {/* Drawer Background */}
              <Card>
                <CardHeader>
                  <CardTitle>Drawer Background</CardTitle>
                  <CardDescription>
                    Set a background image for the hamburger navigation drawer with transparency control
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Background Image</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant={navDrawerBgInputMode === 'upload' ? 'default' : 'outline'} size="sm"
                        onClick={() => setNavDrawerBgInputMode('upload')}>
                        <Upload className="h-3 w-3 mr-1" /> Upload
                      </Button>
                      <Button type="button" variant={navDrawerBgInputMode === 'url' ? 'default' : 'outline'} size="sm"
                        onClick={() => setNavDrawerBgInputMode('url')}>
                        URL
                      </Button>
                    </div>
                  </div>

                  {navDrawerBgInputMode === 'upload' ? (
                    <div className="space-y-2">
                      <Input
                        id="navDrawerBgFile"
                        type="file"
                        accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                        disabled={navDrawerBgUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setNavDrawerBgUploading(true);
                          try {
                            const uploadData = new FormData();
                            uploadData.append('illustration', file);
                            const response = await apiClient.post('/upload/illustration', uploadData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            const url = response.data.url;
                            const fullUrl = url.startsWith('http') ? url : `${getServerUrl()}${url}`;
                            setFormData({ ...formData, navDrawerBgUrl: fullUrl });
                            toast.success('Drawer background uploaded');
                          } catch (error: any) {
                            toast.error(error.response?.data?.error || 'Upload failed');
                          } finally {
                            setNavDrawerBgUploading(false);
                          }
                        }}
                        className="w-full"
                      />
                      {navDrawerBgUploading && <p className="text-xs text-blue-500">Uploading...</p>}
                    </div>
                  ) : (
                    <Input
                      type="url"
                      value={formData.navDrawerBgUrl || ''}
                      onChange={(e) => setFormData({ ...formData, navDrawerBgUrl: e.target.value })}
                      placeholder="https://example.com/drawer-bg.jpg"
                    />
                  )}

                  {formData.navDrawerBgUrl && (
                    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 border-2 border-gray-300 rounded bg-white overflow-hidden" style={{ minWidth: '96px', minHeight: '96px' }}>
                          <img
                            src={resolveAssetUrl(formData.navDrawerBgUrl)}
                            alt="Drawer background"
                            className="w-full h-full object-cover"
                            style={{ opacity: (formData.navDrawerBgOpacity ?? 30) / 100 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setFormData({ ...formData, navDrawerBgUrl: '' });
                          const fileInput = document.getElementById('navDrawerBgFile') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}>
                          <X className="h-4 w-4 mr-1" /> Clear
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Opacity</Label>
                        <div className="flex gap-2 items-center">
                          <Input type="range" min="0" max="100" step="5" value={formData.navDrawerBgOpacity ?? 30}
                            onChange={(e) => setFormData({ ...formData, navDrawerBgOpacity: parseInt(e.target.value) })} className="flex-1" />
                          <span className="text-sm text-gray-500 w-16 text-right">{formData.navDrawerBgOpacity ?? 30}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!formData.navDrawerBgUrl && (
                    <p className="text-xs text-gray-500">Add a background image behind the navigation drawer content</p>
                  )}
                </CardContent>
              </Card>

              {/* Category Display Style */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Display Style</CardTitle>
                  <CardDescription>Choose how categories appear in the navigation drawer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Select
                    value={formData.navDrawerStyle || 'cards'}
                    onValueChange={(value) => setFormData({ ...formData, navDrawerStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cards">Cards with Images</SelectItem>
                      <SelectItem value="plain">Plain Text List</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    "Cards with Images" uses the per-category images below (or falls back to section illustration / first item image). "Plain Text List" shows text only.
                  </p>
                </CardContent>
              </Card>

              {/* Per-Category Images */}
              {selectedMenuId && menuData?.sections && menuData.sections.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Category Images</CardTitle>
                    <CardDescription>
                      Set a custom image for each category in the navigation drawer. Leave empty to use the section illustration or first item image as fallback.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {menuData.sections.map((section: any) => {
                      const sectionTitle = typeof section.title === 'object' && section.title !== null
                        ? (section.title.ENG || Object.values(section.title)[0] || 'Section')
                        : (section.title || 'Section');
                      const currentImage = formData.navDrawerCategoryImages?.[section.id] || '';
                      const inputMode = categoryImageModes[section.id] || (currentImage && !currentImage.startsWith('http') ? 'upload' : 'url');
                      const isUploading = categoryImageUploading[section.id] || false;

                      return (
                        <div key={section.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">{sectionTitle}</Label>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant={inputMode === 'upload' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCategoryImageModes({ ...categoryImageModes, [section.id]: 'upload' })}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </Button>
                              <Button
                                type="button"
                                variant={inputMode === 'url' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCategoryImageModes({ ...categoryImageModes, [section.id]: 'url' })}
                              >
                                URL
                              </Button>
                            </div>
                          </div>

                          {inputMode === 'upload' ? (
                            <div className="space-y-2">
                              <Input
                                id={`catImg-${section.id}`}
                                type="file"
                                accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                                disabled={isUploading}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setCategoryImageUploading({ ...categoryImageUploading, [section.id]: true });
                                  try {
                                    const uploadData = new FormData();
                                    uploadData.append('illustration', file);
                                    const response = await apiClient.post('/upload/illustration', uploadData, {
                                      headers: { 'Content-Type': 'multipart/form-data' },
                                    });
                                    const url = response.data.url;
                                    const fullUrl = url.startsWith('http') ? url : `${getServerUrl()}${url}`;
                                    setFormData({
                                      ...formData,
                                      navDrawerCategoryImages: {
                                        ...(formData.navDrawerCategoryImages || {}),
                                        [section.id]: fullUrl,
                                      },
                                    });
                                    toast.success(`Image uploaded for ${sectionTitle}`);
                                  } catch (error: any) {
                                    toast.error(error.response?.data?.error || 'Upload failed');
                                  } finally {
                                    setCategoryImageUploading({ ...categoryImageUploading, [section.id]: false });
                                  }
                                }}
                                className="w-full"
                              />
                              {isUploading && <p className="text-xs text-blue-500">Uploading...</p>}
                            </div>
                          ) : (
                            <Input
                              type="url"
                              value={currentImage}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  navDrawerCategoryImages: {
                                    ...(formData.navDrawerCategoryImages || {}),
                                    [section.id]: e.target.value,
                                  },
                                });
                              }}
                              placeholder="https://example.com/category-image.jpg"
                            />
                          )}

                          {currentImage && (
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 border-2 border-gray-300 rounded overflow-hidden bg-white" style={{ minWidth: '64px', minHeight: '64px' }}>
                                <img
                                  src={resolveAssetUrl(currentImage)}
                                  alt={`${sectionTitle} nav image`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = { ...(formData.navDrawerCategoryImages || {}) };
                                  delete updated[section.id];
                                  setFormData({ ...formData, navDrawerCategoryImages: updated });
                                  const fileInput = document.getElementById(`catImg-${section.id}`) as HTMLInputElement;
                                  if (fileInput) fileInput.value = '';
                                }}
                              >
                                <X className="h-4 w-4 mr-1" /> Clear
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No menu selected</h3>
                    <p className="text-gray-600 text-center">Select a menu to configure category images</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Live Menu Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    {selectedMenuId ? 'Real-time preview of selected menu' : 'Select a menu to preview'}
                  </CardDescription>
                </div>
                {selectedMenuId && (
                  <div className="flex gap-2">
                    <Button
                      variant={previewView === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewView('desktop')}
                      title="Desktop View"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewView === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewView('mobile')}
                      title="Mobile View"
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedMenuId && menuData ? (
                previewLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : previewUrl ? (
                  <div
                    className={`border-2 rounded-lg overflow-hidden ${
                      previewView === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                    }`}
                    style={{
                      height: previewView === 'mobile' ? '600px' : '600px',
                    }}
                  >
                    <iframe
                      key={previewKey}
                      src={previewUrl}
                      className="w-full h-full border-0"
                      style={{
                        transform: previewView === 'mobile' ? 'scale(0.8)' : 'scale(1)',
                        transformOrigin: 'top left',
                        width: previewView === 'mobile' ? '125%' : '100%',
                        height: previewView === 'mobile' ? '125%' : '100%',
                      }}
                      title="Menu Preview"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Generating preview...</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a menu to see live preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

