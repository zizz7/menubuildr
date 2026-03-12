/**
 * Template Registry
 * Maps template slugs to their generator functions.
 * The classic template uses the existing generateHTML function.
 * New templates can be added by registering their generator functions here.
 */

import { generateHTML } from './menu-generator';
import { generateCardBasedHTML } from './card-based-template';
import { generateCoraFlowHTML } from './coraflow-template';

export type TemplateGeneratorFn = (
  menu: any,
  languages: Array<{ code: string; name: string }>,
  allergens: Array<{ id: string; name: string; imageUrl: string; label: Record<string, string> }>,
  themeOverrides?: any,
  filterMode?: 'exclude' | 'include',
  baseUrl?: string
) => string;

const templateRegistry: Record<string, TemplateGeneratorFn> = {
  'classic': generateHTML,
  'card-based': generateCardBasedHTML,
  'coraflow': generateCoraFlowHTML,
};

export function getTemplateGenerator(slug: string): TemplateGeneratorFn | null {
  return templateRegistry[slug] || null;
}

export function getAvailableTemplateSlugs(): string[] {
  return Object.keys(templateRegistry);
}

export function registerTemplate(slug: string, generator: TemplateGeneratorFn): void {
  templateRegistry[slug] = generator;
}
