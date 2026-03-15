import { z } from 'zod';

// C1.6: Password complexity schema — enforces uppercase, digit, and special character
export const complexPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Sanitize CSS: strip </style> tags and javascript: protocol to prevent XSS (H4)
function sanitizeCss(css: string): string {
  return css
    .replace(/<\/style>/gi, '')   // prevents closing the wrapping <style> tag
    .replace(/javascript:/gi, '') // prevents JS protocol URIs
    .replace(/expression\s*\(/gi, '') // prevents IE expression() injection
    .replace(/<script/gi, '');   // belt-and-suspenders: strip any <script opening
}

// Restaurant validation
export const RestaurantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name too long'),
  slug: z.string().trim().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  currency: z.string().trim().max(10).default('USD'),
  defaultLanguage: z.string().trim().max(10).default('ENG'),
  logoUrl: z.union([
    z.string().trim().url('Logo URL must be a valid URL').max(2000),
    z.literal(''),
    z.null()
  ]).optional().nullable(),
  logoPosition: z.enum(['background', 'right']).optional().nullable(),
});

// Menu validation
export const MenuSchema = z.object({
  name: z.record(z.string().trim()).refine(
    (val) => Object.values(val).some((v) => v && v.trim().length > 0),
    'Menu name is required in at least one language'
  ),
  slug: z.string().trim().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  menuType: z.enum(['breakfast', 'lunch', 'dinner', 'drinks']),
  status: z.enum(['draft', 'published']).default('draft'),
});

// Section validation
export const SectionSchema = z.object({
  title: z.record(z.string().trim()).refine(
    (val) => Object.values(val).some((v) => v && v.trim().length > 0),
    'Section title is required in at least one language'
  ),
  description: z.record(z.string().trim()).optional().nullable(),
  parentSectionId: z.string().uuid().optional().nullable(),
  illustrationUrl: z.union([
    z.string().trim().url('Illustration URL must be a valid URL'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  illustrationAsBackground: z.boolean().default(false).optional(),
  illustrationPosition: z.enum(['center', 'left', 'right']).optional().nullable(),
  illustrationSize: z.enum(['fit', 'fullscreen']).optional().nullable(),
});

// MenuItem validation
export const MenuItemSchema = z.object({
  name: z.record(z.string().trim()).refine(
    (val) => Object.values(val).some((v) => v && v.trim().length > 0),
    'Item name is required in at least one language'
  ),
  description: z.record(z.string().trim()).optional().nullable(),
  price: z.number().positive('Price must be a positive number').optional().nullable(),
  calories: z.number().int().nonnegative('Calories must be a non-negative integer').optional().nullable(),
  imageUrl: z.union([
    z.string().trim().url('Image URL must be a valid URL'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  isAvailable: z.boolean().default(true),
  preparationTime: z.number().int().min(0).max(1000).optional().nullable(),
});

export const BulkItemUpdateSchema = z.object({
  price: z.number().min(0).max(1000000).optional().nullable(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(0).max(1000).optional().nullable(),
  calories: z.number().int().min(0).max(10000).optional().nullable(),
});

// Recipe validation
export const RecipeSchema = z.object({
  ingredients: z.record(z.string().trim()).optional().nullable(),
  ingredientsLabel: z.record(z.string().trim()).optional().nullable(),
  instructions: z.string().trim().max(10000).optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  difficultyLevel: z.string().trim().max(50).optional().nullable(),
});

// Module settings validation — explicit allowlist prevents mass assignment (H6)
export const ModuleSettingsSchema = z.object({
  menuEnabled: z.boolean().optional(),
  sectionsEnabled: z.boolean().optional(),
  itemsEnabled: z.boolean().optional(),
  allergensEnabled: z.boolean().optional(),
  translationsEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  ordersEnabled: z.boolean().optional(),
  inventoryEnabled: z.boolean().optional(),
  reservationsEnabled: z.boolean().optional(),
  loyaltyEnabled: z.boolean().optional(),
  qrCodeEnabled: z.boolean().optional(),
  onlineOrderingEnabled: z.boolean().optional(),
});

// Theme settings validation
export const ThemeSettingsSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  customCss: z.string().optional().nullable().transform((val) => (val ? sanitizeCss(val) : val)),
  customFontsUrls: z.array(z.string().url()).optional().nullable(),
  backgroundIllustrationUrl: z.union([
    z.string().url('Background illustration URL must be a valid URL'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  backgroundIllustrationOpacity: z.number().int().min(0).max(100).optional().nullable(),
  navDrawerStyle: z.enum(['cards', 'plain']).optional().nullable(),
  navDrawerBgUrl: z.union([
    z.string().url('Nav drawer background URL must be a valid URL'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  navDrawerBgOpacity: z.number().int().min(0).max(100).optional().nullable(),
  navDrawerCategoryImages: z.record(z.string(), z.string()).optional().nullable(),
  coverPhotoUrl: z.union([
    z.string().refine((val) => {
      if (val === '') return true;
      // Allow full URLs
      if (val.startsWith('http://') || val.startsWith('https://')) {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      }
      // Allow relative upload paths
      if (val.startsWith('/uploads/')) return true;
      return false;
    }, 'Cover photo URL must be a valid URL or upload path'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  coverPhotoPosition: z.enum(['center', 'left', 'right', 'top', 'bottom']).optional().nullable(),
  coverPhotoSize: z.enum(['cover', 'contain', 'fit', 'fullscreen']).optional().nullable(),
  logoSize: z.number().min(10).max(500).optional().nullable(),
  sectionFontFamily: z.string().optional().nullable(),
  sectionFontSize: z.number().min(0.5).max(10).optional().nullable(),
  sectionBackgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().nullable(),
});


// ─── Import schemas (C1.7) ────────────────────────────────────────────────────

const RecipeDetailsImportSchema = z.object({
  ingredients: z.union([
    z.array(z.object({
      name: z.string().trim(),
      quantity: z.number().nullable().optional(),
      unit: z.string().trim().nullable().optional(),
    })),
    z.record(z.string().trim()),
  ]).optional().nullable(),
  instructions: z.string().trim().nullable().optional(),
  servings: z.number().int().positive().nullable().optional(),
  difficultyLevel: z.string().trim().nullable().optional(),
}).optional().nullable();

const MenuItemImportSchema = z.object({
  name: z.record(z.string().trim()),
  description: z.record(z.string().trim()).optional().nullable(),
  price: z.number().nullable().optional(),
  calories: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().trim().url().nullable().optional().or(z.literal('')).or(z.null()),
  orderIndex: z.number().int().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(0).nullable().optional(),
  allergens: z.array(z.unknown()).optional(),
  recipeDetails: RecipeDetailsImportSchema,
  priceVariations: z.array(z.unknown()).optional(),
  availabilitySchedule: z.unknown().optional(),
});

const SectionImportSchema = z.object({
  title: z.record(z.string().trim()),
  orderIndex: z.number().int().nonnegative().optional(),
  parentSectionId: z.string().trim().nullable().optional(),
  illustrationUrl: z.string().trim().nullable().optional(),
  illustrationAsBackground: z.boolean().optional(),
  illustrationPosition: z.string().trim().nullable().optional(),
  illustrationSize: z.string().trim().nullable().optional(),
  items: z.array(MenuItemImportSchema).optional(),
  categories: z.array(z.unknown()).optional(),
});

const MenuImportItemSchema = z.object({
  name: z.record(z.string().trim()),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  menuType: z.string().trim(),
  status: z.enum(['draft', 'published']).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  themeSettings: z.unknown().optional(),
  sections: z.array(SectionImportSchema).optional(),
});

export const RestaurantImportSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  slug: z.string().trim().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  currency: z.string().trim().optional(),
  defaultLanguage: z.string().trim().optional(),
  activeStatus: z.boolean().optional(),
  logoUrl: z.string().trim().nullable().optional(),
  logoPosition: z.string().trim().nullable().optional(),
  themeSettings: z.object({
    primaryColor: z.string().trim().optional(),
    secondaryColor: z.string().trim().optional(),
    accentColor: z.string().trim().optional(),
    backgroundColor: z.string().trim().optional(),
    textColor: z.string().trim().optional(),
    customCss: z.string().trim().nullable().optional(),
    customFontsUrls: z.array(z.string().trim()).optional(),
    backgroundIllustrationUrl: z.string().trim().nullable().optional(),
  }).optional(),
  moduleSettings: z.object({
    enablePriceVariations: z.boolean().optional(),
    enableAvailabilitySchedule: z.boolean().optional(),
    enableSeasonalItems: z.boolean().optional(),
    enableQrGeneration: z.boolean().optional(),
    enableSubcategories: z.boolean().optional(),
  }).optional(),
  menus: z.array(MenuImportItemSchema).optional(),
});

export const MenuImportSchema = z.object({
  menuName: z.record(z.string().trim()),
  menuSlug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  menuType: z.enum(['breakfast', 'lunch', 'dinner', 'drinks']),
  sections: z.array(z.object({
    title: z.record(z.string().trim()),
    orderIndex: z.number().int().nonnegative(),
    items: z.array(z.object({
      name: z.record(z.string().trim()),
      description: z.record(z.string().trim()).nullable().optional(),
      price: z.number().nullable(),
      calories: z.number().int().nonnegative().nullable().optional(),
      orderIndex: z.number().int().nonnegative(),
      recipeDetails: z.object({
        ingredients: z.array(z.object({
          name: z.string().trim(),
          quantity: z.number().nullable(),
          unit: z.string().trim().nullable(),
        })),
        instructions: z.string().trim().nullable(),
        servings: z.number().int().positive().nullable(),
        difficultyLevel: z.string().trim().nullable(),
      }).nullable().optional(),
    })),
  })),
});
