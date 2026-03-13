import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';
import { MobileNavToggle } from './mobile-nav-toggle';
import { APP_URL } from '@/lib/constants/landing';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <UtensilsCrossed className="h-6 w-6 text-primary" aria-hidden="true" />
          <span>MenuBuildr</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <SmoothScrollLink
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </SmoothScrollLink>
          ))}
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href={`${APP_URL}/login`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Log in
          </a>
          <a
            href={`${APP_URL}/register`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <MobileNavToggle />
      </nav>
    </header>
  );
}
