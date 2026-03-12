'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useMenuStore } from '@/lib/store/menu-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, GripVertical, ArrowLeft, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { CopySectionModal } from '@/components/copy-section-modal';
import { toast } from 'sonner';
import { MultiLanguageInput } from '@/components/multi-language-input';
import { getServerUrl, resolveAssetUrl } from '@/lib/utils';
import {
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Section {
  id: string;
  menuId: string;
  title: Record<string, string>;
  description?: Record<string, string> | null;
  orderIndex: number;
  parentSectionId?: string | null;
  illustrationUrl?: string;
  illustrationAsBackground?: boolean;
  illustrationPosition?: string;
  illustrationSize?: string;
  items?: MenuItem[];
  subSections?: Section[];
}

interface MenuItem {
  id: string;
  sectionId: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: number | null;
  calories?: number | null;
  imageUrl?: string;
  orderIndex: number;
  isAvailable: boolean;
  allergens?: Array<{ id: string; name: string; label: Record<string, string> }>;
  recipeDetails?: {
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    instructions?: string;
    servings?: number;
  };
}

function SortableSection({
  section,
  onEdit,
  onDelete,
  onAddItem,
  onAddSubSection,
  onCopy,
  children,
  isExpanded,
  onToggle,
}: {
  section: Section;
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
  onAddItem: (sectionId: string) => void;
  onAddSubSection: (sectionId: string) => void;
  onCopy: (sectionId: string) => void;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-4 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing flex-shrink-0"
              >
                <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </Button>
              <CardTitle className="text-lg cursor-pointer" onClick={onToggle}>
                {section.title['ENG'] || 'Untitled Section'}
              </CardTitle>
              {section.items && section.items.length > 0 && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(section)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddSubSection(section.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sub-Section
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddItem(section.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(section.id)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to...
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(section.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        {isExpanded && <CardContent className="pt-4">{children}</CardContent>}
      </Card>
    </div>
  );
}

function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-3 p-4 border rounded-lg mb-2 hover:bg-gray-50 transition-colors">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base mb-1">
            {item.name['ENG'] || 'Untitled Item'}
          </div>
          {item.description?.['ENG'] && (
            <div className="text-sm text-gray-600 mb-2 line-clamp-2">
              {item.description['ENG']}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm">
            {item.price && item.price > 0 && (
              <span className="font-semibold text-green-600">
                ${item.price.toFixed(2)}
              </span>
            )}
            {typeof item.calories === 'number' && item.calories > 0 && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {Math.round(item.calories)} kcal
              </span>
            )}
            {!item.isAvailable && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Unavailable
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MenuDetailPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { selectedMenu, setSelectedMenu } = useMenuStore();
  const [menu, setMenu] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [subSectionDialogOpen, setSubSectionDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [parentSectionIdForSubSection, setParentSectionIdForSubSection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [copySectionId, setCopySectionId] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>([]);
  const [allergens, setAllergens] = useState<Array<{ id: string; name: string; imageUrl: string; label: Record<string, string> }>>([]);
  const [sectionForm, setSectionForm] = useState({
    title: {} as Record<string, string>,
    description: {} as Record<string, string>,
    illustrationUrl: '',
    illustrationAsBackground: false,
    illustrationPosition: 'center' as 'center' | 'left' | 'right',
    illustrationSize: 'fit' as 'fit' | 'fullscreen',
  });
  const [illustrationUploading, setIllustrationUploading] = useState(false);
  const [illustrationInputMode, setIllustrationInputMode] = useState<'upload' | 'url'>('url');
  const [itemForm, setItemForm] = useState({
    name: {} as Record<string, string>,
    description: {} as Record<string, string>,
    price: null as number | null,
    calories: null as number | null,
    imageUrl: '',
    isAvailable: true,
    allergenIds: [] as string[],
  });
  const [ingredients, setIngredients] = useState<Record<string, string>>({});
  const [ingredientsLabel, setIngredientsLabel] = useState<Record<string, string>>({});

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
    fetchMenu();
    fetchLanguages();
    fetchAllergens();
  }, [menuId]);

  const fetchAllergens = async () => {
    try {
      const response = await apiClient.get('/allergens');
      setAllergens(response.data);
    } catch (error) {
      console.error('Failed to fetch allergens:', error);
      setAllergens([]);
    }
  };

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

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/menus/${menuId}`);
      setMenu(response.data);
      setSelectedMenu(response.data);
      const fetchedSections = response.data.sections || [];
      setSections(fetchedSections);
      
      // Load expanded sections from localStorage, or default to all expanded
      const storageKey = `menu-${menuId}-expanded-sections`;
      const savedExpanded = localStorage.getItem(storageKey);
      if (savedExpanded) {
        try {
          const savedIds = JSON.parse(savedExpanded) as string[];
          // Only include sections that still exist
          const validIds = savedIds.filter((id) => 
            fetchedSections.some((s: Section) => s.id === id)
          );
          setExpandedSections(new Set(validIds));
        } catch (error) {
          // If parsing fails, default to all expanded
          setExpandedSections(new Set(fetchedSections.map((s: Section) => s.id)));
        }
      } else {
        // Initialize all sections as expanded by default
        setExpandedSections(new Set(fetchedSections.map((s: Section) => s.id)));
      }
    } catch (error) {
      toast.error('Failed to fetch menu');
      router.push('/dashboard/menus');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      
      // Save to localStorage
      const storageKey = `menu-${menuId}-expanded-sections`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      
      return newSet;
    });
  };

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    const newSections = arrayMove(sections, oldIndex, newIndex);
    setSections(newSections);

    // Update order indices
    try {
      for (let i = 0; i < newSections.length; i++) {
        await apiClient.put(`/sections/${newSections[i].id}/reorder`, {
          orderIndex: i,
        });
      }
    } catch (error) {
      toast.error('Failed to reorder sections');
      fetchMenu();
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const section = sections.find((s) => s.id === sectionId);
    if (!section || !section.items) return;

    const oldIndex = section.items.findIndex((i) => i.id === active.id);
    const newIndex = section.items.findIndex((i) => i.id === over.id);

    const newItems = arrayMove(section.items, oldIndex, newIndex);
    const updatedSections = sections.map((s) =>
      s.id === sectionId ? { ...s, items: newItems } : s
    );
    setSections(updatedSections);

    try {
      for (let i = 0; i < newItems.length; i++) {
        await apiClient.put(`/items/${newItems[i].id}/reorder`, {
          orderIndex: i,
        });
      }
    } catch (error) {
      toast.error('Failed to reorder items');
      fetchMenu();
    }
  };

  const handleOpenSectionDialog = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        title: section.title,
        description: section.description || {},
        illustrationUrl: section.illustrationUrl || '',
        illustrationAsBackground: section.illustrationAsBackground || false,
        illustrationPosition: (section.illustrationPosition as 'center' | 'left' | 'right') || 'center',
        illustrationSize: (section.illustrationSize as 'fit' | 'fullscreen') || 'fit',
      });
      // Determine input mode based on existing illustrationUrl
      setIllustrationInputMode(section.illustrationUrl && section.illustrationUrl.startsWith('http') ? 'url' : 'upload');
    } else {
      setEditingSection(null);
      const defaultTitle: Record<string, string> = {};
      languages.forEach((lang) => {
        defaultTitle[lang.code] = '';
      });
      setSectionForm({
        title: defaultTitle,
        description: {},
        illustrationUrl: '',
        illustrationAsBackground: false,
        illustrationPosition: 'center' as 'center' | 'left' | 'right',
        illustrationSize: 'fit' as 'fit' | 'fullscreen',
      });
      setIllustrationInputMode('url');
    }
    setSectionDialogOpen(true);
  };

  const handleIllustrationUpload = async (file: File) => {
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (PNG, SVG, JPEG, or WebP)');
      return;
    }

    setIllustrationUploading(true);
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

      setSectionForm({ ...sectionForm, illustrationUrl: fullUrl });
      toast.success('Illustration uploaded successfully');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to upload illustration';
      toast.error(errorMsg);
      console.error('Illustration upload error:', error);
    } finally {
      setIllustrationUploading(false);
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one language has a title
    const hasTitle = Object.values(sectionForm.title).some((title) => title && title.trim().length > 0);
    if (!hasTitle) {
      toast.error('Please enter a section title in at least one language');
      return;
    }

    // Clean up illustrationUrl - convert empty string to null
    const formData = {
      ...sectionForm,
      illustrationUrl: sectionForm.illustrationUrl?.trim() || null,
    };

    try {
      if (editingSection) {
        await apiClient.put(`/sections/${editingSection.id}`, formData);
        toast.success('Section updated successfully');
      } else {
        await apiClient.post(`/sections/menu/${menuId}`, formData);
        toast.success('Section created successfully');
      }
      setSectionDialogOpen(false);
      fetchMenu();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Operation failed';
      toast.error(errorMsg);
      console.error('Section creation error:', error.response?.data);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure? This will delete all items in this section.')) return;
    try {
      await apiClient.delete(`/sections/${id}`);
      toast.success('Section deleted successfully');
      fetchMenu();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete section');
    }
  };

  const handleOpenSubSectionDialog = (parentSectionId: string) => {
    setParentSectionIdForSubSection(parentSectionId);
    setEditingSection(null);
    const defaultTitle: Record<string, string> = {};
    languages.forEach((lang) => {
      defaultTitle[lang.code] = '';
    });
    setSectionForm({
      title: defaultTitle,
      description: {},
      illustrationUrl: '',
      illustrationAsBackground: false,
      illustrationPosition: 'center',
      illustrationSize: 'fit',
    });
    setSubSectionDialogOpen(true);
  };

  const handleSubSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one language has a title
    const hasTitle = Object.values(sectionForm.title).some((title) => title && title.trim().length > 0);
    if (!hasTitle) {
      toast.error('Please enter a sub-section title in at least one language');
      return;
    }

    if (!parentSectionIdForSubSection) {
      toast.error('Parent section ID is missing');
      return;
    }

    // Clean up illustrationUrl - convert empty string to null
    const formData = {
      ...sectionForm,
      parentSectionId: parentSectionIdForSubSection,
      illustrationUrl: sectionForm.illustrationUrl?.trim() || null,
    };

    try {
      if (editingSection) {
        await apiClient.put(`/sections/${editingSection.id}`, formData);
        toast.success('Sub-section updated successfully');
      } else {
        await apiClient.post(`/sections/menu/${menuId}`, formData);
        toast.success('Sub-section created successfully');
      }
      setSubSectionDialogOpen(false);
      setParentSectionIdForSubSection(null);
      fetchMenu();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Operation failed';
      toast.error(errorMsg);
      console.error('Sub-section creation error:', error.response?.data);
    }
  };

  const handleEditSubSection = (subSection: Section) => {
    setEditingSection(subSection);
    setParentSectionIdForSubSection(subSection.parentSectionId || null);
    setSectionForm({
      title: subSection.title,
      description: subSection.description || {},
      illustrationUrl: subSection.illustrationUrl || '',
      illustrationAsBackground: subSection.illustrationAsBackground || false,
      illustrationPosition: (subSection.illustrationPosition as 'center' | 'left' | 'right') || 'center',
      illustrationSize: (subSection.illustrationSize as 'fit' | 'fullscreen') || 'fit',
    });
    setSubSectionDialogOpen(true);
  };

  const toggleSubSection = (subSectionId: string) => {
    setExpandedSubSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subSectionId)) {
        newSet.delete(subSectionId);
      } else {
        newSet.add(subSectionId);
      }
      return newSet;
    });
  };

  const handleOpenItemDialog = async (sectionId: string, item?: MenuItem) => {
    setSelectedSectionId(sectionId);
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || {},
        price: item.price,
        calories: item.calories ?? null,
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
        allergenIds: (item.allergens || []).map((a: any) => a.id),
      });
      // Fetch recipe details if they exist
      if (item.id) {
        try {
          const response = await apiClient.get(`/items/${item.id}`);
          if (response.data.recipeDetails?.ingredients) {
            // Check if ingredients is array (old format) or object (new format)
            const ing = response.data.recipeDetails.ingredients;
            if (Array.isArray(ing)) {
              // Convert old array format to text (just for display, we'll use new format)
              setIngredients({});
            } else if (typeof ing === 'object' && ing !== null) {
              setIngredients(ing);
            } else {
              setIngredients({});
            }
          } else {
            setIngredients({});
          }
          // Load ingredients label
          if (response.data.recipeDetails?.ingredientsLabel && typeof response.data.recipeDetails.ingredientsLabel === 'object') {
            setIngredientsLabel(response.data.recipeDetails.ingredientsLabel);
          } else {
            setIngredientsLabel({});
          }
        } catch (error) {
          console.error('Failed to fetch recipe details:', error);
          setIngredients({});
          setIngredientsLabel({});
        }
      }
    } else {
      setEditingItem(null);
      const defaultName: Record<string, string> = {};
      const defaultDesc: Record<string, string> = {};
      languages.forEach((lang) => {
        defaultName[lang.code] = '';
        defaultDesc[lang.code] = '';
      });
      setItemForm({
        name: defaultName,
        description: defaultDesc,
        price: null,
        calories: null,
        imageUrl: '',
        isAvailable: true,
        allergenIds: [],
      });
      setIngredients({});
      setIngredientsLabel({});
    }
    setItemDialogOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId) return;

    // Validate that at least one language has a name
    const hasName = Object.values(itemForm.name).some((name) => name && name.trim().length > 0);
    if (!hasName) {
      toast.error('Please enter an item name in at least one language');
      return;
    }

    // Price is optional - no validation needed

    // Clean up imageUrl - convert empty string to null, validate URL if provided
    let imageUrl = itemForm.imageUrl?.trim() || null;
    if (imageUrl && imageUrl.length > 0) {
      try {
        new URL(imageUrl); // Validate URL format
      } catch {
        toast.error('Please enter a valid image URL or leave it empty');
        return;
      }
    } else {
      imageUrl = null;
    }

    // Prepare form data
    const formData = {
      ...itemForm,
      imageUrl,
      // Price is optional - convert to null if empty or 0
      price: itemForm.price && itemForm.price > 0 ? parseFloat(itemForm.price.toString()) : null,
      // Calories is optional - convert to integer or null if empty/0
      calories: itemForm.calories && itemForm.calories > 0 ? Math.round(itemForm.calories) : null,
      allergenIds: itemForm.allergenIds || [],
    };

    try {
      let itemId: string;
      
      if (editingItem) {
        // Update existing item
        await apiClient.put(`/items/${editingItem.id}`, formData);
        itemId = editingItem.id;
        toast.success('Item updated successfully');
      } else {
        // Create new item
        const response = await apiClient.post(`/items/section/${selectedSectionId}`, formData);
        itemId = response.data.id;
        toast.success('Item created successfully');
      }

      // Save ingredients separately to recipe details endpoint
      // Check if ingredients have any content
      const hasIngredients = Object.values(ingredients).some((ing) => ing && ing.trim().length > 0);
      const hasIngredientsLabel = Object.values(ingredientsLabel).some((v) => v && v.trim().length > 0);
      
      if (hasIngredients || hasIngredientsLabel || editingItem) {
        // Send ingredients (even if empty, to update/clear them)
        try {
          await apiClient.put(`/items/${itemId}/recipe`, {
            ingredients: hasIngredients ? ingredients : null,
            ingredientsLabel: hasIngredientsLabel ? ingredientsLabel : null,
          });
        } catch (recipeError: any) {
          console.error('Failed to save ingredients:', recipeError);
          // Don't show error if ingredients are empty and recipe doesn't exist
          if (hasIngredients) {
            toast.error('Item saved but failed to save ingredients');
          }
        }
      }

      setItemDialogOpen(false);

      // Optimistic local state update instead of full fetchMenu()
      // Fetch the updated/created item from the server to get full data (with allergens populated)
      try {
        const updatedItemResponse = await apiClient.get(`/items/${itemId}`);
        const updatedItem = updatedItemResponse.data;

        setSections((prevSections) => {
          // Helper to update items in a section or its sub-sections
          const updateSectionItems = (section: Section): Section => {
            const updatedItems = editingItem
              ? (section.items || []).map((i) => i.id === itemId ? { ...i, ...updatedItem } : i)
              : section.id === selectedSectionId
                ? [...(section.items || []), updatedItem]
                : section.items || [];

            const updatedSubSections = section.subSections?.map((sub) => {
              const subItems = editingItem
                ? (sub.items || []).map((i) => i.id === itemId ? { ...i, ...updatedItem } : i)
                : sub.id === selectedSectionId
                  ? [...(sub.items || []), updatedItem]
                  : sub.items || [];
              return { ...sub, items: subItems };
            });

            return { ...section, items: updatedItems, subSections: updatedSubSections };
          };

          return prevSections.map(updateSectionItems);
        });
      } catch {
        // Fallback: if fetching the updated item fails, do a full refresh
        fetchMenu();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Operation failed';
      toast.error(errorMsg);
      console.error('Item creation error:', error.response?.data);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await apiClient.delete(`/items/${id}`);
      toast.success('Item deleted successfully');
      fetchMenu();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete item');
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

  if (!menu) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => router.push('/dashboard/menus')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {menu.name['ENG'] || 'Menu Editor'}
          </h1>
          <p className="text-gray-600 mt-2">{menu.slug}</p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sections</h2>
          <p className="text-sm text-gray-600 mt-1">
            Organize your menu items into sections. Drag to reorder.
          </p>
        </div>
        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenSectionDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? 'Edit Section' : 'Create Section'}
              </DialogTitle>
              <DialogDescription>
                {editingSection
                  ? 'Update section information'
                  : 'Add a new section to organize menu items'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSectionSubmit} className="space-y-4">
              <MultiLanguageInput
                label="Section Title"
                value={sectionForm.title}
                onChange={(value) => setSectionForm({ ...sectionForm, title: value })}
                languages={languages}
                defaultLanguage="ENG"
                placeholder="Enter section title"
                showTranslate={true}
              />
              <MultiLanguageInput
                label="Section Description (optional)"
                value={sectionForm.description}
                onChange={(value) => setSectionForm({ ...sectionForm, description: value })}
                languages={languages}
                defaultLanguage="ENG"
                placeholder="Enter section description"
                showTranslate={true}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="illustrationUrl">Illustration (optional)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={illustrationInputMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIllustrationInputMode('upload')}
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant={illustrationInputMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIllustrationInputMode('url')}
                    >
                      URL
                    </Button>
                  </div>
                </div>
                
                {illustrationInputMode === 'upload' ? (
                  <div className="space-y-3">
                    <Input
                      id="illustrationFile"
                      type="file"
                      accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleIllustrationUpload(file);
                        }
                      }}
                      className="w-full"
                      disabled={illustrationUploading}
                    />
                    {illustrationUploading && (
                      <p className="text-xs text-blue-500">Uploading illustration...</p>
                    )}
                  </div>
                ) : (
                  <Input
                    id="illustrationUrl"
                    type="url"
                    value={sectionForm.illustrationUrl}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, illustrationUrl: e.target.value })
                    }
                    placeholder="https://example.com/illustration.svg"
                  />
                )}

                {sectionForm.illustrationUrl && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <Label>Preview</Label>
                    <div className="mt-3 flex items-center gap-4">
                      <div
                        className="w-24 h-24 flex items-center justify-center border-2 border-gray-300 rounded bg-white overflow-hidden"
                        style={{ minWidth: '96px', minHeight: '96px' }}
                      >
                        <img
                          src={sectionForm.illustrationUrl}
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
                          {sectionForm.illustrationUrl}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSectionForm({ ...sectionForm, illustrationUrl: '' });
                            const fileInput = document.getElementById('illustrationFile') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {!sectionForm.illustrationUrl && (
                  <p className="text-xs text-gray-500">
                    Leave empty if you don't have an illustration
                  </p>
                )}

                {sectionForm.illustrationUrl && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="illustrationAsBackground"
                        checked={sectionForm.illustrationAsBackground}
                        onCheckedChange={(checked) =>
                          setSectionForm({ ...sectionForm, illustrationAsBackground: checked as boolean })
                        }
                      />
                      <Label htmlFor="illustrationAsBackground" className="cursor-pointer">
                        Use as background
                      </Label>
                    </div>

                    {sectionForm.illustrationAsBackground && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="illustrationPosition">Background Position</Label>
                          <Select
                            value={sectionForm.illustrationPosition}
                            onValueChange={(value: 'center' | 'left' | 'right') =>
                              setSectionForm({ ...sectionForm, illustrationPosition: value })
                            }
                          >
                            <SelectTrigger id="illustrationPosition">
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
                          <Label htmlFor="illustrationSize">Background Size</Label>
                          <Select
                            value={sectionForm.illustrationSize}
                            onValueChange={(value: 'fit' | 'fullscreen') =>
                              setSectionForm({ ...sectionForm, illustrationSize: value })
                            }
                          >
                            <SelectTrigger id="illustrationSize">
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
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSectionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSection ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Sub-Section Dialog */}
        <Dialog open={subSectionDialogOpen} onOpenChange={setSubSectionDialogOpen}>
          <DialogContent className="max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? 'Edit Sub-Section' : 'Create Sub-Section'}
              </DialogTitle>
              <DialogDescription>
                {editingSection
                  ? 'Update sub-section information'
                  : 'Add a new sub-section under this section'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubSectionSubmit} className="space-y-4">
              <MultiLanguageInput
                label="Sub-Section Title"
                value={sectionForm.title}
                onChange={(value) => setSectionForm({ ...sectionForm, title: value })}
                languages={languages}
                defaultLanguage="ENG"
                placeholder="Enter sub-section title"
                showTranslate={true}
              />
              <MultiLanguageInput
                label="Sub-Section Description (optional)"
                value={sectionForm.description}
                onChange={(value) => setSectionForm({ ...sectionForm, description: value })}
                languages={languages}
                defaultLanguage="ENG"
                placeholder="Enter sub-section description"
                showTranslate={true}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subSectionIllustrationUrl">Illustration (optional)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={illustrationInputMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIllustrationInputMode('upload')}
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant={illustrationInputMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIllustrationInputMode('url')}
                    >
                      URL
                    </Button>
                  </div>
                </div>
                
                {illustrationInputMode === 'upload' ? (
                  <div className="space-y-3">
                    <Input
                      id="subSectionIllustrationFile"
                      type="file"
                      accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleIllustrationUpload(file);
                        }
                      }}
                      className="w-full"
                      disabled={illustrationUploading}
                    />
                    {illustrationUploading && (
                      <p className="text-xs text-blue-500">Uploading illustration...</p>
                    )}
                  </div>
                ) : (
                  <Input
                    id="subSectionIllustrationUrl"
                    type="url"
                    value={sectionForm.illustrationUrl}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, illustrationUrl: e.target.value })
                    }
                    placeholder="https://example.com/illustration.svg"
                  />
                )}

                {sectionForm.illustrationUrl && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <Label>Preview</Label>
                    <div className="mt-3 flex items-center gap-4">
                      <div
                        className="w-24 h-24 flex items-center justify-center border-2 border-gray-300 rounded bg-white overflow-hidden"
                        style={{ minWidth: '96px', minHeight: '96px' }}
                      >
                        <img
                          src={sectionForm.illustrationUrl}
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
                          {sectionForm.illustrationUrl}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSectionForm({ ...sectionForm, illustrationUrl: '' });
                            const fileInput = document.getElementById('subSectionIllustrationFile') as HTMLInputElement;
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

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSubSectionDialogOpen(false);
                    setParentSectionIdForSubSection(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSection ? 'Update' : 'Create'} Sub-Section
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSection
              key={section.id}
              section={section}
              onEdit={handleOpenSectionDialog}
              onDelete={handleDeleteSection}
              onAddItem={handleOpenItemDialog}
              onAddSubSection={handleOpenSubSectionDialog}
              onCopy={(sectionId) => setCopySectionId(sectionId)}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleItemDragEnd(e, section.id)}
              >
                <SortableContext
                  items={(section.items || []).map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {(section.items || []).map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onEdit={(item) => handleOpenItemDialog(section.id, item)}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {(!section.items || section.items.length === 0) && (!section.subSections || section.subSections.length === 0) && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500 text-sm mb-2">
                    No items in this section yet.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenItemDialog(section.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              )}
              
              {/* Sub-Sections */}
              {section.subSections && section.subSections.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Sub-Sections</h4>
                  {section.subSections.map((subSection) => (
                    <Card key={subSection.id} className="ml-6 border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSubSection(subSection.id)}
                              className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
                            >
                              {expandedSubSections.has(subSection.id) ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                            <CardTitle className="text-base cursor-pointer" onClick={() => toggleSubSection(subSection.id)}>
                              {subSection.title['ENG'] || 'Untitled Sub-Section'}
                            </CardTitle>
                            {subSection.items && subSection.items.length > 0 && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {subSection.items.length} {subSection.items.length === 1 ? 'item' : 'items'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSubSection(subSection)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenItemDialog(subSection.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Item
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSection(subSection.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedSubSections.has(subSection.id) && (
                        <CardContent className="pt-4">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleItemDragEnd(e, subSection.id)}
                          >
                            <SortableContext
                              items={(subSection.items || []).map((i) => i.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {(subSection.items || []).map((item) => (
                                <SortableItem
                                  key={item.id}
                                  item={item}
                                  onEdit={(item) => handleOpenItemDialog(subSection.id, item)}
                                  onDelete={handleDeleteItem}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                          {(!subSection.items || subSection.items.length === 0) && (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                              <p className="text-gray-500 text-sm mb-2">
                                No items in this sub-section yet.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenItemDialog(subSection.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Item
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first section to start organizing menu items.
              </p>
              <Button onClick={() => handleOpenSectionDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Section
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Menu Item' : 'Create Menu Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update menu item information'
                : 'Add a new item to this section. Type in the default language and it will auto-translate.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <MultiLanguageInput
              label="Item Name"
              value={itemForm.name}
              onChange={(value) => setItemForm({ ...itemForm, name: value })}
              languages={languages}
              defaultLanguage="ENG"
              placeholder="Enter item name"
              showTranslate={true}
            />
            <MultiLanguageInput
              label="Description"
              value={itemForm.description}
              onChange={(value) => setItemForm({ ...itemForm, description: value })}
              languages={languages}
              defaultLanguage="ENG"
              placeholder="Enter item description"
              type="textarea"
              showTranslate={true}
            />
            <MultiLanguageInput
              label="Expandable Section Title (optional)"
              value={ingredientsLabel}
              onChange={(value) => setIngredientsLabel(value)}
              languages={languages}
              defaultLanguage="ENG"
              placeholder="Ingredients"
              type="input"
              showTranslate={true}
            />
            <MultiLanguageInput
              label="Ingredients (optional)"
              value={ingredients}
              onChange={(value) => setIngredients(value)}
              languages={languages}
              defaultLanguage="ENG"
              placeholder="Enter ingredients (e.g., 2 slices bread, 2 eggs, 1 avocado...)"
              type="textarea"
              showTranslate={true}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price || ''}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="Optional"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calories (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  step="1"
                  min="0"
                  value={itemForm.calories ?? ''}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, calories: e.target.value ? parseInt(e.target.value, 10) : null })
                  }
                  placeholder="Optional"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Optional integer kcal (e.g., 350)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={itemForm.imageUrl}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, imageUrl: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Leave empty if you don't have an image URL. Must be a valid URL if provided.
                </p>
              </div>
            </div>
            
            {/* Allergen Selection */}
            <div className="space-y-3">
              <Label>Food Legends / Allergens</Label>
              <p className="text-xs text-gray-500 mb-3">
                Click to select allergens or food properties for this dish
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-80 overflow-y-auto overflow-x-hidden p-3 border rounded-lg bg-gray-50">
                {allergens.map((allergen) => {
                  const isSelected = itemForm.allergenIds.includes(allergen.id);
                  // Use shorter name - remove "Contains" prefix if present
                  const defaultLabel = (allergen.label['ENG'] || allergen.name)
                    .replace(/^contains?\s+/i, '')
                    .replace(/^contains\s+/i, '');
                  
                  return (
                    <button
                      key={allergen.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setItemForm({
                            ...itemForm,
                            allergenIds: itemForm.allergenIds.filter((id) => id !== allergen.id),
                          });
                        } else {
                          setItemForm({
                            ...itemForm,
                            allergenIds: [...itemForm.allergenIds, allergen.id],
                          });
                        }
                      }}
                      className={`
                        relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? 'border-blue-600 bg-blue-50 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }
                        cursor-pointer min-h-[90px] group
                      `}
                      title={allergen.label['ENG'] || allergen.name}
                    >
                      <img
                        src={resolveAssetUrl(allergen.imageUrl)}
                        alt={allergen.label['ENG'] || allergen.name}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-red-100 rounded"><span class="text-xs text-red-500">No Image</span></div>';
                          }
                        }}
                      />
                      <span className={`text-xs font-medium text-center leading-tight ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                        {defaultLabel}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
                {allergens.length === 0 && (
                  <p className="text-sm text-gray-500 col-span-full">
                    No allergens available. Add allergens in the Allergens page first.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CopySectionModal
        sectionId={copySectionId || ''}
        currentMenuId={menuId}
        isOpen={!!copySectionId}
        onClose={() => setCopySectionId(null)}
        onSuccess={() => fetchMenu()}
      />
    </div>
  );
}

