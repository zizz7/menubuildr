'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import { useMenuStore } from '@/lib/store/menu-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, RotateCcw, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Version {
  id: string;
  menuId: string;
  versionNumber: number;
  createdAt: string;
  notes?: string;
  createdBy: string;
}

interface Menu {
  id: string;
  name: Record<string, string>;
  slug: string;
}

export default function VersionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants } = useRestaurantStore();
  const { menus, setMenus } = useMenuStore();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (restaurants.length > 0 && !selectedRestaurantId) {
      setSelectedRestaurantId(restaurants[0].id);
      fetchMenus(restaurants[0].id);
    }
  }, [restaurants]);

  useEffect(() => {
    if (selectedMenuId) {
      fetchVersions(selectedMenuId);
    }
  }, [selectedMenuId]);

  const fetchMenus = async (restaurantId: string) => {
    try {
      const response = await apiClient.get(`/menus/restaurant/${restaurantId}`);
      setMenus(response.data);
      if (response.data.length > 0 && !selectedMenuId) {
        setSelectedMenuId(response.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch menus');
    }
  };

  const fetchVersions = async (menuId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/menus/${menuId}/versions`);
      setVersions(response.data);
    } catch (error) {
      toast.error('Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setSelectedMenuId(null);
    setVersions([]);
    fetchMenus(restaurantId);
  };

  const handleMenuChange = (menuId: string) => {
    setSelectedMenuId(menuId);
  };

  const handleRestore = async (versionId: string) => {
    if (!selectedMenuId) return;
    if (!confirm('Are you sure you want to restore this version? This will replace the current menu.')) return;

    try {
      await apiClient.post(`/menus/${selectedMenuId}/restore/${versionId}`);
      toast.success('Version restored successfully');
      fetchVersions(selectedMenuId);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to restore version');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (restaurants.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
            <p className="text-gray-600 text-center mb-4">
              Create a restaurant first to view version history
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
          <h1 className="text-3xl font-bold">Version History</h1>
          <p className="text-gray-600 mt-2">View and restore menu versions</p>
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
          {selectedRestaurantId && (
            <Select
              value={selectedMenuId || ''}
              onValueChange={handleMenuChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select menu" />
              </SelectTrigger>
              <SelectContent>
                {menus
                  .filter((m) => m.restaurantId === selectedRestaurantId)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name['ENG'] || m.slug}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading versions...</p>
        </div>
      ) : versions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No versions yet</h3>
            <p className="text-gray-600 text-center mb-4">
              {selectedMenuId
                ? 'Publish a menu to create your first version'
                : 'Select a menu to view versions'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-gray-600" />
                    <CardTitle>Version {version.versionNumber}</CardTitle>
                    {version.versionNumber === versions[0].versionNumber && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {formatDate(version.createdAt)}
                  </div>
                </div>
                {version.notes && (
                  <CardDescription>{version.notes}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {version.versionNumber !== versions[0].versionNumber && (
                    <Button
                      variant="outline"
                      onClick={() => handleRestore(version.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore This Version
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/menus/${selectedMenuId}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Current Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

