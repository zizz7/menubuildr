import { create } from 'zustand';

interface Menu {
  id: string;
  restaurantId: string;
  name: Record<string, string>; // Multi-language
  slug: string;
  menuType: string;
  status: 'draft' | 'published';
  orderIndex: number;
  sections?: Section[];
}

interface Section {
  id: string;
  menuId: string;
  title: Record<string, string>; // Multi-language
  orderIndex: number;
  illustrationUrl?: string;
  items?: MenuItem[];
  categories?: Category[];
}

interface Category {
  id: string;
  sectionId: string;
  name: Record<string, string>;
  orderIndex: number;
}

interface MenuItem {
  id: string;
  sectionId: string;
  categoryId?: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: number;
  calories?: number | null;
  imageUrl?: string;
  orderIndex: number;
  isAvailable: boolean;
  preparationTime?: number;
  allergens?: Allergen[];
  recipeDetails?: RecipeDetails;
  priceVariations?: PriceVariation[];
}

interface Allergen {
  id: string;
  name: string;
  svgCode: string;
  label: Record<string, string>;
}

interface RecipeDetails {
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions?: string;
  servings?: number;
  difficultyLevel?: string;
}

interface PriceVariation {
  id: string;
  variationName: string;
  price: number;
  orderIndex: number;
}

interface MenuState {
  menus: Menu[];
  selectedMenu: Menu | null;
  setMenus: (menus: Menu[]) => void;
  setSelectedMenu: (menu: Menu | null) => void;
  addMenu: (menu: Menu) => void;
  updateMenu: (id: string, updates: Partial<Menu>) => void;
  removeMenu: (id: string) => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  menus: [],
  selectedMenu: null,
  setMenus: (menus) => set({ menus }),
  setSelectedMenu: (menu) => set({ selectedMenu: menu }),
  addMenu: (menu) =>
    set((state) => ({
      menus: [...state.menus, menu],
    })),
  updateMenu: (id, updates) =>
    set((state) => ({
      menus: state.menus.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      selectedMenu:
        state.selectedMenu?.id === id
          ? { ...state.selectedMenu, ...updates }
          : state.selectedMenu,
    })),
  removeMenu: (id) =>
    set((state) => ({
      menus: state.menus.filter((m) => m.id !== id),
      selectedMenu: state.selectedMenu?.id === id ? null : state.selectedMenu,
    })),
}));

