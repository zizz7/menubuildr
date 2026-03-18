import { SmoothScrollLink } from './smooth-scroll-link';
import { MobileNavToggle } from './mobile-nav-toggle';
import { APP_URL } from '@/lib/constants/landing';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Templates', href: '#templates' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full frosted-glass border-b border-forest/5">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10"
      >
        <a href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl font-bold text-forest tracking-tight">
            MenuBuildr
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <SmoothScrollLink
              key={link.href}
              href={link.href}
              className="nav-link text-sm font-medium text-forest/70 hover:text-forest transition-colors"
            >
              {link.label}
            </SmoothScrollLink>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a
            href={`${APP_URL}/login`}
            className="text-sm font-medium text-forest/70 hover:text-forest transition-colors"
          >
            Log in
          </a>
          <a
            href={`${APP_URL}/register`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-forest px-6 text-sm font-medium text-cream hover:bg-forest-light transition-colors"
          >
            Get Started
          </a>
        </div>

        <div className="md:hidden">
          <MobileNavToggle />
        </div>
      </nav>
    </header>
  );
}
