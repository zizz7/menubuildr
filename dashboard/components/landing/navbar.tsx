import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';
import { MobileNavToggle } from './mobile-nav-toggle';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-xl tracking-tight">
          <UtensilsCrossed className="h-6 w-6 text-primary" aria-hidden="true" />
          <span>MenuBuildr</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <SmoothScrollLink
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </SmoothScrollLink>
          ))}
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] duration-150"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <MobileNavToggle />
      </nav>
    </header>
  );
}
