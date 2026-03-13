import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { Footer } from '@/components/landing/footer';
import { JsonLd } from '@/components/landing/json-ld';
import { AuthRedirect } from '@/components/landing/auth-redirect';
import { BASE_URL, PRICING_PLANS } from '@/lib/constants/landing';

export const metadata: Metadata = {
  title: 'MenuBuildr — Digital Menu Builder for Restaurants',
  description:
    'Create and manage digital menus for your restaurants. Multi-language support, allergen management, and beautiful templates.',
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'MenuBuildr — Digital Menu Builder for Restaurants',
    description:
      'Create and manage digital menus for your restaurants. Multi-language support, allergen management, and beautiful templates.',
    url: BASE_URL,
    siteName: 'MenuBuildr',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MenuBuildr — Digital Menu Builder for Restaurants',
    description:
      'Create and manage digital menus for your restaurants. Multi-language support, allergen management, and beautiful templates.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MenuBuildr',
  url: BASE_URL,
  logo: `${BASE_URL}/og-image.png`,
  sameAs: [],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MenuBuildr',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BASE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'MenuBuildr',
  description:
    'Digital menu builder for restaurants with multi-language support, allergen management, and beautiful templates.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0',
    highPrice: '79',
    offerCount: PRICING_PLANS.length,
  },
};

export default function LandingPage() {
  return (
    <>
      <AuthRedirect />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
      </main>
      <Footer />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={productJsonLd} />
    </>
  );
}
