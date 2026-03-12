'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import { useMenuStore } from '@/lib/store/menu-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileText, Database, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportExportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants } = useRestaurantStore();
  const { menus, addMenu } = useMenuStore();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!isAuthenticated()) {
    router.push('/login');
    return null;
  }

  const handleExportRestaurant = async () => {
    if (!selectedRestaurantId) {
      toast.error('Please select a restaurant');
      return;
    }

    try {
      setExporting(true);
      const response = await apiClient.post(
        `/restaurants/${selectedRestaurantId}/export`,
        {},
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `restaurant-${selectedRestaurantId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Restaurant data exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export restaurant');
    } finally {
      setExporting(false);
    }
  };

  const handleExportMenu = async () => {
    if (!selectedMenuId) {
      toast.error('Please select a menu');
      return;
    }

    try {
      setExporting(true);
      const response = await apiClient.post(
        `/menus/${selectedMenuId}/export`,
        { format: 'json' },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `menu-${selectedMenuId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Menu data exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export menu');
    } finally {
      setExporting(false);
    }
  };

  const handleExportMenuCSV = async () => {
    if (!selectedMenuId) {
      toast.error('Please select a menu');
      return;
    }

    try {
      setExporting(true);
      const response = await apiClient.post(
        `/menus/${selectedMenuId}/export`,
        { format: 'csv' },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `menu-${selectedMenuId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Menu data exported as CSV successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export menu');
    } finally {
      setExporting(false);
    }
  };

  const handleImportRestaurant = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const json = JSON.parse(text);
      await apiClient.post('/restaurants/import', json);
      toast.success(`Restaurant "${json.name}" imported successfully`);
      event.target.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import restaurant');
      event.target.value = '';
    } finally {
      setImporting(false);
    }
  };

  const handleImportMenuItems = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMenuId) {
      toast.error('Please select a menu first');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      await apiClient.post(`/menus/${selectedMenuId}/import-items`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Menu items imported successfully');
      event.target.value = ''; // Reset file input
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import menu items');
    } finally {
      setImporting(false);
    }
  };

  // Import a full menu from JSON (e.g. from excel-to-menu-json output)
  const handleImportMenu = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!selectedRestaurantId) {
      toast.error('Please select a restaurant first');
      event.target.value = '';
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const json = JSON.parse(text);
      const { data } = await apiClient.post(
        `/restaurants/${selectedRestaurantId}/import-menu`,
        json
      );
      if (data?.id) {
        addMenu({
          id: data.id,
          restaurantId: data.restaurantId,
          name: data.name,
          slug: data.slug,
          menuType: data.menuType,
          status: data.status,
          orderIndex: data.orderIndex,
        });
      }
      const menuName = json.menuName?.ENG || json.menuSlug || 'Menu';
      toast.success(`"${menuName}" imported successfully`);
      event.target.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import menu');
      event.target.value = '';
    } finally {
      setImporting(false);
    }
  };

  const currentRestaurantMenus = menus.filter((m) => m.restaurantId === selectedRestaurantId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import / Export</h1>
        <p className="text-gray-600 mt-2">Import and export restaurant and menu data</p>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          {/* Export Restaurant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Export Restaurant
              </CardTitle>
              <CardDescription>
                Export complete restaurant data including menus, sections, and items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedRestaurantId || ''}
                onValueChange={setSelectedRestaurantId}
              >
                <SelectTrigger className="w-full">
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
              <Button
                onClick={handleExportRestaurant}
                disabled={!selectedRestaurantId || exporting}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export Restaurant (JSON)'}
              </Button>
            </CardContent>
          </Card>

          {/* Export Menu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export Menu
              </CardTitle>
              <CardDescription>
                Export menu data in JSON or CSV format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select
                  value={selectedRestaurantId || ''}
                  onValueChange={(value) => {
                    setSelectedRestaurantId(value);
                    setSelectedMenuId(null);
                  }}
                >
                  <SelectTrigger className="w-full">
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
                <Select
                  value={selectedMenuId || ''}
                  onValueChange={setSelectedMenuId}
                  disabled={!selectedRestaurantId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentRestaurantMenus.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name['ENG'] || m.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportMenu}
                  disabled={!selectedMenuId || exporting}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button
                  onClick={handleExportMenuCSV}
                  disabled={!selectedMenuId || exporting}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          {/* Import Restaurant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Import Restaurant
              </CardTitle>
              <CardDescription>
                Import restaurant data from a JSON file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportRestaurant}
                  disabled={importing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500">
                  Select a JSON file exported from this system
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Import Menu (full menu JSON from Excel converter) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Import Menu
              </CardTitle>
              <CardDescription>
                Import a full menu (sections + items + ingredients) from a JSON file. Use the JSON files generated from the Excel converter (e.g. tazaa-lunch-menu.json).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedRestaurantId || ''}
                onValueChange={(value) => {
                  setSelectedRestaurantId(value);
                  setSelectedMenuId(null);
                }}
              >
                <SelectTrigger className="w-full">
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
              <input
                type="file"
                accept=".json"
                onChange={handleImportMenu}
                disabled={!selectedRestaurantId || importing}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500">
                Select a menu JSON file (e.g. from server/import-data/ after running npm run excel-to-json)
              </p>
            </CardContent>
          </Card>

          {/* Import Menu Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Import Menu Items
              </CardTitle>
              <CardDescription>
                Import menu items from a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select
                  value={selectedRestaurantId || ''}
                  onValueChange={(value) => {
                    setSelectedRestaurantId(value);
                    setSelectedMenuId(null);
                  }}
                >
                  <SelectTrigger className="w-full">
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
                <Select
                  value={selectedMenuId || ''}
                  onValueChange={setSelectedMenuId}
                  disabled={!selectedRestaurantId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentRestaurantMenus.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name['ENG'] || m.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportMenuItems}
                  disabled={!selectedMenuId || importing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500">
                  CSV format: name_ENG, description_ENG, price, section_name
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Generate CSV template
                    const csv = 'name_ENG,description_ENG,price,section_name\n"Pancakes","Fluffy pancakes",12.99,"Breakfast"';
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'menu-items-template.csv');
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                >
                  Download CSV Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

