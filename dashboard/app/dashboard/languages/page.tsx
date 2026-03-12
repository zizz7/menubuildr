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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Languages as LanguagesIcon, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Language {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  orderIndex: number;
}

export default function LanguagesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    isActive: true,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/languages');
      setLanguages(response.data.sort((a: Language, b: Language) => a.orderIndex - b.orderIndex));
    } catch (error) {
      toast.error('Failed to fetch languages');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (language?: Language) => {
    if (language) {
      setEditingLanguage(language);
      setFormData({
        code: language.code,
        name: language.name,
        isActive: language.isActive,
      });
    } else {
      setEditingLanguage(null);
      setFormData({
        code: '',
        name: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLanguage) {
        await apiClient.put(`/languages/${editingLanguage.id}`, formData);
        toast.success('Language updated successfully');
      } else {
        await apiClient.post('/languages', formData);
        toast.success('Language created successfully');
      }
      setDialogOpen(false);
      fetchLanguages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this language?')) return;
    try {
      await apiClient.delete(`/languages/${id}`);
      toast.success('Language deleted successfully');
      fetchLanguages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete language');
    }
  };

  const handleToggleActive = async (language: Language) => {
    try {
      await apiClient.put(`/languages/${language.id}`, {
        ...language,
        isActive: !language.isActive,
      });
      toast.success(`Language ${!language.isActive ? 'activated' : 'deactivated'}`);
      fetchLanguages();
    } catch (error: any) {
      toast.error('Failed to update language');
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
          <h1 className="text-3xl font-bold">Languages</h1>
          <p className="text-gray-600 mt-2">Manage available languages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Language
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLanguage ? 'Edit Language' : 'Create Language'}
              </DialogTitle>
              <DialogDescription>
                {editingLanguage
                  ? 'Update language information'
                  : 'Add a new language to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Language Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  required
                  maxLength={3}
                  placeholder="ENG"
                  disabled={!!editingLanguage}
                />
                <p className="text-xs text-gray-500">
                  3-letter code (e.g., ENG, CHN, GER)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Language Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="English"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked === true })
                  }
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (available for use)
                </Label>
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
                  {editingLanguage ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {languages.map((language) => (
          <Card key={language.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LanguagesIcon className="h-6 w-6 text-gray-600" />
                  <CardTitle>{language.name}</CardTitle>
                </div>
                {language.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <CardDescription>Code: {language.code}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(language)}
                >
                  {language.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(language)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(language.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {languages.length === 0 && (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LanguagesIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No languages yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Add languages to enable multi-language support
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Language
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

