'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, BookOpen, Menu, TrendingUp, Palette } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants, setRestaurants } = useRestaurantStore();
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <Skeleton variant="text" className="h-9 w-48 rounded-md" />
          <Skeleton variant="text" className="h-5 w-80 mt-2 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50 shadow-sm rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton variant="text" className="h-4 w-20 rounded" />
                <Skeleton variant="circular" className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton variant="text" className="h-8 w-12 rounded-md" />
                <Skeleton variant="text" className="h-3 w-28 mt-2 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/50 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="border-b border-border/30 bg-muted/50 py-6">
            <Skeleton variant="text" className="h-6 w-32 rounded-md" />
            <Skeleton variant="text" className="h-4 w-64 mt-1 rounded" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-8">
                  <Skeleton variant="rounded" className="h-11 w-11 mb-4" />
                  <Skeleton variant="text" className="h-5 w-36 rounded-md" />
                  <Skeleton variant="text" className="h-4 w-56 mt-2 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Overview of your menu management system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Restaurants</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
            <p className="text-xs text-muted-foreground mt-1">Active establishments</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Menus</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMenus}</div>
            <p className="text-xs text-muted-foreground mt-1">Digital menus created</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedMenus}</div>
            <p className="text-xs text-muted-foreground mt-1">Live customer views</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Items</CardTitle>
            <Menu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Individual menu entries</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/50 py-6">
          <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">Common management tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30 border-t-0">
            <button
              onClick={() => router.push('/dashboard/restaurants')}
              className="group p-8 text-left transition-colors hover:bg-muted/50 duration-100"
            >
              <div className="mb-4 inline-flex items-center justify-center p-3 rounded-md bg-muted border border-border/50 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">Manage Restaurants</h3>
              <p className="text-sm text-muted-foreground mt-1">Add new locations or update establishment details.</p>
            </button>
            <button
              onClick={() => router.push('/dashboard/menus')}
              className="group p-8 text-left transition-colors hover:bg-muted/50 duration-100"
            >
              <div className="mb-4 inline-flex items-center justify-center p-3 rounded-md bg-muted border border-border/50 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">Manage Menus</h3>
              <p className="text-sm text-muted-foreground mt-1">Create and redesign your digital menu structures.</p>
            </button>
            <button
              onClick={() => router.push('/dashboard/theme')}
              className="group p-8 text-left transition-colors hover:bg-muted/50 duration-100"
            >
              <div className="mb-4 inline-flex items-center justify-center p-3 rounded-md bg-muted border border-border/50 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">Customize Theme</h3>
              <p className="text-sm text-muted-foreground mt-1">Adjust your brand appearance and styling options.</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

