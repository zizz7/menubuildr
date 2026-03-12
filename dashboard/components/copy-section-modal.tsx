'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CopySectionModalProps {
  sectionId: string;
  currentMenuId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Restaurant {
  id: string;
  name: string;
}

interface Menu {
  id: string;
  name: Record<string, string>;
  slug: string;
}

interface RestaurantWithMenus {
  restaurant: Restaurant;
  menus: Menu[];
}

export function CopySectionModal({ sectionId, currentMenuId, isOpen, onClose, onSuccess }: CopySectionModalProps) {
  const [restaurantMenus, setRestaurantMenus] = useState<RestaurantWithMenus[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMenuId(null);
      fetchRestaurantsAndMenus();
    }
  }, [isOpen]);

  const fetchRestaurantsAndMenus = async () => {
    setLoadingData(true);
    try {
      const restaurantsRes = await apiClient.get('/restaurants');
      const restaurants: Restaurant[] = restaurantsRes.data;

      const results: RestaurantWithMenus[] = [];
      for (const restaurant of restaurants) {
        try {
          const menusRes = await apiClient.get(`/menus/restaurant/${restaurant.id}`);
          results.push({ restaurant, menus: menusRes.data });
        } catch {
          results.push({ restaurant, menus: [] });
        }
      }
      setRestaurantMenus(results);
    } catch {
      toast.error('Failed to load restaurants and menus');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedMenuId) return;
    setCopying(true);
    try {
      await apiClient.post(`/sections/${sectionId}/copy`, { targetMenuId: selectedMenuId });
      toast.success('Section copied successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to copy section';
      toast.error(msg);
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Section To...</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">Loading menus...</span>
            </div>
          ) : restaurantMenus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No menus available.</p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {restaurantMenus.map(({ restaurant, menus }) => (
                <div key={restaurant.id}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    {restaurant.name}
                  </h4>
                  {menus.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-2">No menus</p>
                  ) : (
                    <div className="space-y-1">
                      {menus.map((menu) => {
                        const isCurrent = menu.id === currentMenuId;
                        return (
                          <button
                            key={menu.id}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setSelectedMenuId(menu.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              isCurrent
                                ? 'opacity-50 cursor-not-allowed bg-muted'
                                : selectedMenuId === menu.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-accent'
                            }`}
                          >
                            <span>{menu.name['ENG'] || menu.slug}</span>
                            {isCurrent && (
                              <span className="ml-2 text-xs">(current menu)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={copying}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!selectedMenuId || copying}>
            {copying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Copying...
              </>
            ) : (
              'Copy'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
