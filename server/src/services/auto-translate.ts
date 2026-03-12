/**
 * Auto-Translation Service
 * Automatically translates menu item names and descriptions
 * into all active languages during the publish flow.
 * Uses the 'translate' package (free Google Translate API).
 */

import translate from 'translate';
import prisma from '../config/database';

// Map internal language codes to ISO 639-1 codes for the translate API
const languageCodeMap: Record<string, string> = {
  'ENG': 'en',
  'CHN': 'zh',
  'GER': 'de',
  'JAP': 'ja',
  'RUS': 'ru',
  'FRA': 'fr',
  'SPA': 'es',
  'ITA': 'it',
  'POR': 'pt',
  'KOR': 'ko',
  'ARA': 'ar',
  'HIN': 'hi',
  'TUR': 'tr',
  'POL': 'pl',
  'DUT': 'nl',
};

function getISOCode(langCode: string): string {
  return languageCodeMap[langCode] || langCode.toLowerCase().substring(0, 2);
}

async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (fromLang === toLang) return text;

  try {
    const result = await translate(text, {
      from: getISOCode(fromLang),
      to: getISOCode(toLang),
    });
    return result || text;
  } catch (error) {
    console.error(`Translation failed (${fromLang} -> ${toLang}): "${text}"`, error);
    return text; // Fallback to original text
  }
}

/**
 * Auto-translate all menu items for a given menu into all active languages.
 * Populates the multi-language JSON fields (name, description) on each MenuItem.
 * Also translates section titles.
 */
export async function autoTranslateMenu(menuId: string): Promise<{ translatedItems: number; translatedSections: number; errors: string[] }> {
  const errors: string[] = [];
  let translatedItems = 0;
  let translatedSections = 0;

  // Get all active languages
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  });

  if (languages.length <= 1) {
    return { translatedItems: 0, translatedSections: 0, errors: ['Only one language active, skipping translation'] };
  }

  // Get the menu with all sections and items
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      restaurant: { select: { defaultLanguage: true } },
      sections: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!menu) {
    return { translatedItems: 0, translatedSections: 0, errors: ['Menu not found'] };
  }

  const defaultLang = menu.restaurant.defaultLanguage || 'ENG';
  const targetLanguages = languages.filter(l => l.code !== defaultLang);

  if (targetLanguages.length === 0) {
    return { translatedItems: 0, translatedSections: 0, errors: ['No target languages to translate to'] };
  }

  // Translate section titles
  for (const section of menu.sections) {
    try {
      const titleJson = (section.title as Record<string, string>) || {};
      const sourceText = titleJson[defaultLang] || Object.values(titleJson)[0] || '';

      if (!sourceText.trim()) continue;

      let updated = false;
      for (const lang of targetLanguages) {
        // Only translate if not already translated
        if (!titleJson[lang.code] || titleJson[lang.code] === sourceText) {
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          titleJson[lang.code] = await translateText(sourceText, defaultLang, lang.code);
          updated = true;
        }
      }

      // Translate description if present
      const descriptionJson = (section.description as Record<string, string> | null) || null;
      if (descriptionJson) {
        const sourceDescription = descriptionJson[defaultLang] || Object.values(descriptionJson)[0] || '';
        if (sourceDescription.trim()) {
          for (const lang of targetLanguages) {
            if (!descriptionJson[lang.code] || descriptionJson[lang.code] === sourceDescription) {
              await new Promise(resolve => setTimeout(resolve, 100));
              descriptionJson[lang.code] = await translateText(sourceDescription, defaultLang, lang.code);
              updated = true;
            }
          }
        }
      }

      if (updated) {
        await prisma.section.update({
          where: { id: section.id },
          data: {
            title: titleJson,
            ...(descriptionJson ? { description: descriptionJson } : {}),
          },
        });
        translatedSections++;
      }
    } catch (error: any) {
      errors.push(`Section "${section.id}": ${error.message}`);
    }
  }

  // Translate menu items
  for (const section of menu.sections) {
    for (const item of section.items) {
      try {
        const nameJson = (item.name as Record<string, string>) || {};
        const descJson = (item.description as Record<string, string>) || {};

        const sourceName = nameJson[defaultLang] || Object.values(nameJson)[0] || '';
        const sourceDesc = descJson[defaultLang] || Object.values(descJson)[0] || '';

        let updated = false;

        for (const lang of targetLanguages) {
          // Translate name if not already translated
          if (sourceName.trim() && (!nameJson[lang.code] || nameJson[lang.code] === sourceName)) {
            await new Promise(resolve => setTimeout(resolve, 100));
            nameJson[lang.code] = await translateText(sourceName, defaultLang, lang.code);
            updated = true;
          }

          // Translate description if not already translated
          if (sourceDesc.trim() && (!descJson[lang.code] || descJson[lang.code] === sourceDesc)) {
            await new Promise(resolve => setTimeout(resolve, 100));
            descJson[lang.code] = await translateText(sourceDesc, defaultLang, lang.code);
            updated = true;
          }
        }

        if (updated) {
          await prisma.menuItem.update({
            where: { id: item.id },
            data: {
              name: nameJson,
              description: descJson,
            },
          });
          translatedItems++;
        }
      } catch (error: any) {
        errors.push(`Item "${item.id}": ${error.message}`);
      }
    }
  }

  // Also translate the menu name itself
  try {
    const menuNameJson = (menu.name as Record<string, string>) || {};
    const sourceMenuName = menuNameJson[defaultLang] || Object.values(menuNameJson)[0] || '';

    if (sourceMenuName.trim()) {
      let menuUpdated = false;
      for (const lang of targetLanguages) {
        if (!menuNameJson[lang.code] || menuNameJson[lang.code] === sourceMenuName) {
          await new Promise(resolve => setTimeout(resolve, 100));
          menuNameJson[lang.code] = await translateText(sourceMenuName, defaultLang, lang.code);
          menuUpdated = true;
        }
      }

      if (menuUpdated) {
        await prisma.menu.update({
          where: { id: menuId },
          data: { name: menuNameJson },
        });
      }
    }
  } catch (error: any) {
    errors.push(`Menu name: ${error.message}`);
  }

  return { translatedItems, translatedSections, errors };
}
