import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/constants/landing';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/dashboard/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
