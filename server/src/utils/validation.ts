import { z } from 'zod';

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
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  currency: z.string().max(10).default('USD'),
  defaultLanguage: z.string().max(10).default('ENG'),
  logoUrl: z.union([
    z.string().url('Logo URL must be a valid URL').max(2000),
    z.literal(''),
    z.null()
  ]).optional().nullable(),
  logoPosition: z.enum(['background', 'right']).optional().nullable(),
});

// Menu validation
export const MenuSchema = z.object({
  name: z.record(z.string()).refine(
    (val) => Object.values(val).some((v) => v && v.trim().length > 0),
    'Menu name is required in at least one language'
  ),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  menuType: z.enum(['breakfast', 'lunch', 'dinner', 'drinks']),
  status: z.enum(['draft', 'published']).default('draft'),
});

// Section validation
export const SectionSchema = z.object({
  title: z.record(z.string()).refine(
    (val) => Object.values(val).some((v) => v && v.trim().length > 0),
    'Section title is required in at least one language'
  ),
  description: z.record(z.string()).optional().nullable(),
  parentSectionId: z.string().uuid().optional().nullable(),
  illustrationUrl: z.union([
    z.string().url('Illustration URL must be a valid URL'),
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
  name: z.record(z.string()).refine(
    (val) => Object.values(val).some((v) => v && v.trim().length > 0),
    'Item name is required in at least one language'
  ),
  description: z.record(z.string()).optional().nullable(),
  price: z.number().positive('Price must be a positive number').optional().nullable(),
  calories: z.number().int().nonnegative('Calories must be a non-negative integer').optional().nullable(),
  imageUrl: z.union([
    z.string().url('Image URL must be a valid URL'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  isAvailable: z.boolean().default(true),
  preparationTime: z.number().int().min(0).max(1000).optional(),
});

export const BulkItemUpdateSchema = z.object({
  price: z.number().min(0).max(1000000).optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(0).max(1000).optional(),
  calories: z.number().int().min(0).max(10000).optional(),
});

// Recipe validation
export const RecipeSchema = z.object({
  ingredients: z.record(z.string()).optional().nullable(),
  ingredientsLabel: z.record(z.string()).optional().nullable(),
  instructions: z.string().max(10000).optional(),
  servings: z.number().int().positive().optional(),
  difficultyLevel: z.string().max(50).optional(),
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
  customCss: z.string().optional().transform((val) => (val ? sanitizeCss(val) : val)),
  customFontsUrls: z.array(z.string().url()).optional(),
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

