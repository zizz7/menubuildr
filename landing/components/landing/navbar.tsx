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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <nav aria-label="Main navigation" className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground group-hover:bg-primary/90 transition-colors">
            <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-foreground group-hover:text-primary transition-colors">MenuBuildr</span>
        </a>

        <div className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <SmoothScrollLink
              key={link.href}
              href={link.href}
              className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all duration-200"
            >
              {link.label}
            </SmoothScrollLink>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <a
            href={`${APP_URL}/login`}
            className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all duration-200"
          >
            Log in
          </a>
          <a
            href={`${APP_URL}/register`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-[13px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Join Now
          </a>
        </div>

        <div className="md:hidden">
          <MobileNavToggle />
        </div>
      </nav>
    </header>
  );
}
