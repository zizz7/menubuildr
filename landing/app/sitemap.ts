import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/constants/landing';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  ];
}
