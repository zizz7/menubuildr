'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, FileText, GripVertical, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { MultiLanguageInput } from '@/components/multi-language-input';
import { resolveAssetUrl } from '@/lib/utils';import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Allergen {
  id: string;
  name: string;
  imageUrl: string;
  label: Record<string, string>;
  isCustom: boolean;
  orderIndex: number;
}

function SortableAllergen({
  allergen,
  onEdit,
  onDelete,
}: {
  allergen: Allergen;
  onEdit: (allergen: Allergen) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: allergen.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-2 hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing flex-shrink-0"
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            
            {/* Icon Preview */}
            <div
              key={`preview-${allergen.id}`}
              className="w-12 h-12 flex items-center justify-center border rounded bg-white overflow-hidden flex-shrink-0"
            >
              {allergen.imageUrl && allergen.imageUrl.trim() ? (
                <img
                  src={resolveAssetUrl(allergen.imageUrl)}
                  alt={allergen.label['ENG'] || allergen.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-red-100 rounded"><span class="text-xs text-red-500">No Image</span></div>';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-100 rounded">
                  <span className="text-xs text-red-500">No Image</span>
                </div>
              )}
            </div>
            
            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{allergen.name}</h3>
                {allergen.isCustom && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded flex-shrink-0">
                    Custom
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(allergen)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(allergen.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AllergensPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);
  const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    label: {} as Record<string, string>,
  });
  const [uploading, setUploading] = useState(false);
  const [filterMode, setFilterMode] = useState<'exclude' | 'include'>('exclude');
  const [savingSettings, setSavingSettings] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchAllergens();
    fetchLanguages();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/allergens/settings');
      setFilterMode(response.data.filterMode || 'exclude');
    } catch (error) {
      console.error('Failed to fetch allergen settings:', error);
    }
  };

  const handleFilterModeChange = async (mode: 'exclude' | 'include') => {
    setSavingSettings(true);
    try {
      await apiClient.put('/allergens/settings', { filterMode: mode });
      setFilterMode(mode);
      toast.success(`Filter mode set to ${mode === 'exclude' ? 'Exclude' : 'Include'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update filter mode');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchLanguages = async () => {
    try {
      const response = await apiClient.get('/languages');
      setLanguages(response.data.filter((l: any) => l.isActive));
    } catch (error: any) {
      console.error('Failed to fetch languages:', error);
      // Provide fallback languages if API fails
      const fallbackLanguages = [
        { code: 'ENG', name: 'English' },
        { code: 'CHN', name: 'Chinese' },
        { code: 'GER', name: 'German' },
        { code: 'JAP', name: 'Japanese' },
        { code: 'RUS', name: 'Russian' },
      ];
      setLanguages(fallbackLanguages);
      if (error.response?.status === 401) {
        toast.error('Please log in again');
        router.push('/login');
      } else if (error.response?.status >= 500) {
        toast.error('Backend server error. Please check if the server is running.');
      }
    }
  };

  const fetchAllergens = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/allergens');
      setAllergens(response.data.sort((a: Allergen, b: Allergen) => a.orderIndex - b.orderIndex));
    } catch (error) {
      toast.error('Failed to fetch allergens');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (allergen?: Allergen) => {
    if (allergen) {
      setEditingAllergen(allergen);
      setFormData({
        name: allergen.name,
        imageUrl: allergen.imageUrl,
        label: allergen.label,
      });
    } else {
      setEditingAllergen(null);
      const defaultLabel: Record<string, string> = {};
      languages.forEach((lang) => {
        defaultLabel[lang.code] = '';
      });
      setFormData({
        name: '',
        imageUrl: '',
        label: defaultLabel,
      });
    }
    // Reset file input
    const fileInput = document.getElementById('allergenImage') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (PNG, JPG, JPEG, or WebP)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('icon', file);

      const response = await apiClient.post('/upload/allergen-icon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFormData((prev) => ({
        ...prev,
        imageUrl: response.data.url,
      }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to upload image';
      toast.error(errorMsg);
      console.error('Image upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate image URL
    if (!formData.imageUrl || !formData.imageUrl.trim()) {
      toast.error('Please upload an image file');
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        imageUrl: formData.imageUrl.trim(),
        label: formData.label,
      };
      
      if (editingAllergen) {
        await apiClient.put(`/allergens/${editingAllergen.id}`, payload);
        toast.success('Allergen updated successfully');
      } else {
        await apiClient.post('/allergens', payload);
        toast.success('Allergen created successfully');
      }
      setDialogOpen(false);
      // Reset form
      setFormData({ name: '', imageUrl: '', label: {} as Record<string, string> });
      const fileInput = document.getElementById('allergenImage') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Force refresh allergens list
      await fetchAllergens();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Operation failed';
      toast.error(errorMsg);
      console.error('Allergen submit error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this allergen icon?')) return;
    try {
      await apiClient.delete(`/allergens/${id}`);
      toast.success('Allergen deleted successfully');
      fetchAllergens();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete allergen');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = allergens.findIndex((a) => a.id === active.id);
    const newIndex = allergens.findIndex((a) => a.id === over.id);

    const newAllergens = arrayMove(allergens, oldIndex, newIndex);
    setAllergens(newAllergens);

    try {
      await apiClient.put('/allergens/reorder', {
        allergenIds: newAllergens.map((a) => a.id),
      });
      toast.success('Allergens reordered successfully');
    } catch (error) {
      toast.error('Failed to reorder allergens');
      fetchAllergens();
    }
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
          <h1 className="text-3xl font-bold">Allergen Icons</h1>
          <p className="text-gray-600 mt-2">Manage allergen icons and labels</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Allergen Icon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle>
                {editingAllergen ? 'Edit Allergen Icon' : 'Create Allergen Icon'}
              </DialogTitle>
              <DialogDescription>
                {editingAllergen
                  ? 'Update allergen icon information'
                  : 'Add a new custom allergen icon'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (internal identifier)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                  }
                  required
                  placeholder="vegetarian"
                  disabled={!!editingAllergen}
                />
                <p className="text-xs text-gray-500">
                  Lowercase, no spaces (e.g., vegetarian, vegan, dairy)
                </p>
              </div>
              <MultiLanguageInput
                label="Labels"
                value={formData.label}
                onChange={(value) => setFormData({ ...formData, label: value })}
                languages={languages}
                defaultLanguage="ENG"
                placeholder="Enter label"
                showTranslate={true}
              />
              <div className="space-y-2">
                <Label htmlFor="allergenImage">Icon Image (PNG, JPG, JPEG, WebP)</Label>
                <div className="space-y-3">
                  <Input
                    id="allergenImage"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleImageUpload(file);
                      }
                    }}
                    className="w-full"
                    disabled={uploading}
                  />
                  {formData.imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, imageUrl: '' });
                        // Reset file input
                        const fileInput = document.getElementById('allergenImage') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Upload a PNG, JPG, JPEG, or WebP image file for the allergen icon
                </p>
                {uploading && (
                  <p className="text-xs text-blue-500">Uploading image...</p>
                )}
              </div>
              {formData.imageUrl && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <Label>Preview</Label>
                  <div className="mt-3 flex items-center gap-4">
                    <div
                      className="w-20 h-20 flex items-center justify-center border-2 border-gray-300 rounded bg-white overflow-hidden"
                      style={{ minWidth: '80px', minHeight: '80px' }}
                    >
                      <img
                        src={resolveAssetUrl(formData.imageUrl)}
                        alt="Preview"
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
                      <p className="text-xs text-gray-500">
                        Image preview (80x80px)
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAllergen ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Mode Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filter Mode Settings
          </CardTitle>
          <CardDescription>
            Set how allergen filtering works in generated menus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filterMode">Filter Logic Type</Label>
              <Select
                value={filterMode}
                onValueChange={(value: 'exclude' | 'include') => handleFilterModeChange(value)}
                disabled={savingSettings}
              >
                <SelectTrigger id="filterMode" className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclude">
                    <div>
                      <div className="font-semibold">Exclude Mode</div>
                      <div className="text-xs text-gray-500">Hide items that contain selected allergens</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="include">
                    <div>
                      <div className="font-semibold">Include Mode</div>
                      <div className="text-xs text-gray-500">Show only items that contain selected allergens</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {filterMode === 'exclude' 
                  ? 'When users click an allergen, items containing that allergen will be hidden.'
                  : 'When users click an allergen, only items containing that allergen will be shown.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={allergens.map((a) => a.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {allergens.map((allergen) => (
              <SortableAllergen
                key={allergen.id}
                allergen={allergen}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {allergens.length === 0 && (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No allergen icons yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Default icons are pre-loaded. Add custom icons as needed.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Allergen Icon
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

