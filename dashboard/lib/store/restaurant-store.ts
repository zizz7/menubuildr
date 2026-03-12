import { create } from 'zustand';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  logoPosition?: string;
  currency: string;
  defaultLanguage: string;
  activeStatus: boolean;
  themeSettings?: ThemeSettings;
  moduleSettings?: ModuleSettings;
  _count?: { menus: number };
}

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
}

interface ModuleSettings {
  id: string;
  enablePriceVariations: boolean;
  enableAvailabilitySchedule: boolean;
  enableSeasonalItems: boolean;
  enableQrGeneration: boolean;
  enableSubcategories: boolean;
}

interface RestaurantState {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  setRestaurants: (restaurants: Restaurant[]) => void;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  addRestaurant: (restaurant: Restaurant) => void;
  updateRestaurant: (id: string, updates: Partial<Restaurant>) => void;
  removeRestaurant: (id: string) => void;
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  restaurants: [],
  selectedRestaurant: null,
  setRestaurants: (restaurants) => set({ restaurants }),
  setSelectedRestaurant: (restaurant) => set({ selectedRestaurant: restaurant }),
  addRestaurant: (restaurant) =>
    set((state) => ({
      restaurants: [...state.restaurants, restaurant],
    })),
  updateRestaurant: (id, updates) =>
    set((state) => ({
      restaurants: state.restaurants.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
      selectedRestaurant:
        state.selectedRestaurant?.id === id
          ? { ...state.selectedRestaurant, ...updates }
          : state.selectedRestaurant,
    })),
  removeRestaurant: (id) =>
    set((state) => ({
      restaurants: state.restaurants.filter((r) => r.id !== id),
      selectedRestaurant:
        state.selectedRestaurant?.id === id ? null : state.selectedRestaurant,
    })),
}));

