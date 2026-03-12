'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface SearchResult {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: number;
  location: {
    restaurant: string;
    restaurantId: string;
    menu: Record<string, string>;
    menuId: string;
    section: Record<string, string>;
    sectionId: string;
  };
  allergens: Array<{ id: string; name: string; label: Record<string, string> }>;
}

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { restaurants } = useRestaurantStore();
  const [query, setQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [selectedMenu, setSelectedMenu] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const params = new URLSearchParams({
        q: query,
      });

      if (selectedRestaurant && selectedRestaurant !== 'all') {
        params.append('restaurant', selectedRestaurant);
      }
      if (selectedMenu && selectedMenu !== 'all') {
        params.append('menu', selectedMenu);
      }

      const response = await apiClient.get(`/search?${params.toString()}`);
      setResults(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleNavigateToItem = (result: SearchResult) => {
    router.push(`/dashboard/menus/${result.location.menuId}`);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-gray-600 mt-2">Search across all menus and items</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for menu items..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by restaurant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedMenu}
                onValueChange={setSelectedMenu}
                disabled={!selectedRestaurant || selectedRestaurant === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by menu (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Menus</SelectItem>
                  {/* Menu options would be loaded based on selected restaurant */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {results.length} {results.length === 1 ? 'result' : 'results'} found
            </h2>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-gray-600 text-center">
                  Try adjusting your search terms or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleNavigateToItem(result)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">
                          {result.name['ENG'] || Object.values(result.name)[0]}
                        </h3>
                        {result.description && (
                          <p className="text-gray-600 text-sm mb-2">
                            {result.description['ENG'] || Object.values(result.description)[0]}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {result.price && result.price > 0 && (
                            <span className="font-medium text-green-600">
                              ${result.price.toFixed(2)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {result.location.restaurant} →{' '}
                            {typeof result.location.section === 'object'
                              ? result.location.section['ENG']
                              : result.location.section}
                          </span>
                        </div>
                        {result.allergens && result.allergens.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {result.allergens.map((allergen) => (
                              <span
                                key={allergen.id}
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                              >
                                {allergen.label['ENG'] || allergen.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Search Menu Items</h3>
            <p className="text-gray-600 text-center mb-4">
              Enter a search query above to find items across all menus
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

