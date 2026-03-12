'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, BookOpen, Menu, TrendingUp, Palette } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants, setRestaurants } = useRestaurantStore();
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalMenus: 0,
    totalItems: 0,
    publishedMenus: 0,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const restaurantsRes = await apiClient.get('/restaurants');
      setRestaurants(restaurantsRes.data);
      
      // Get menus for all restaurants
      const allMenus: any[] = [];
      let totalItems = 0;
      
      for (const restaurant of restaurantsRes.data) {
        try {
          const menusRes = await apiClient.get(`/menus/restaurant/${restaurant.id}`);
          const menus = menusRes.data || [];
          allMenus.push(...menus);
          
          // Count items from sections
          menus.forEach((menu: any) => {
            if (menu.sections) {
              menu.sections.forEach((section: any) => {
                if (section._count?.items) {
                  totalItems += section._count.items;
                }
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching menus for restaurant ${restaurant.id}:`, error);
        }
      }
      
      const totalMenus = allMenus.length;
      const publishedMenus = allMenus.filter((m: any) => m.status === 'published').length;
      
      setStats({
        totalRestaurants: restaurantsRes.data.length,
        totalMenus,
        totalItems,
        publishedMenus,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('ECONNREFUSED')) {
        console.error('Backend server is not running. Please start it with: cd server && npm run dev');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your menu management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
            <p className="text-xs text-muted-foreground">Active restaurants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Menus</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMenus}</div>
            <p className="text-xs text-muted-foreground">All menus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Menus</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedMenus}</div>
            <p className="text-xs text-muted-foreground">Live menus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <Menu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Total items</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/restaurants')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Store className="h-6 w-6 mb-2" />
              <h3 className="font-semibold">Manage Restaurants</h3>
              <p className="text-sm text-gray-600">Add or edit restaurants</p>
            </button>
            <button
              onClick={() => router.push('/dashboard/menus')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <BookOpen className="h-6 w-6 mb-2" />
              <h3 className="font-semibold">Manage Menus</h3>
              <p className="text-sm text-gray-600">Create and edit menus</p>
            </button>
            <button
              onClick={() => router.push('/dashboard/theme')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Palette className="h-6 w-6 mb-2" />
              <h3 className="font-semibold">Customize Theme</h3>
              <p className="text-sm text-gray-600">Adjust colors and styling</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

