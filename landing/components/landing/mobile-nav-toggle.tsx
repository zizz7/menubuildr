'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Templates', href: '#templates' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

export function MobileNavToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="p-2 rounded-lg text-forest hover:bg-forest/5 transition-colors"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 frosted-glass border-b border-forest/5 p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <SmoothScrollLink
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm font-medium text-forest/70 hover:text-forest hover:bg-forest/5 rounded-lg transition-colors"
              >
                {link.label}
              </SmoothScrollLink>
            ))}
            <div className="h-px bg-forest/10 my-3" />
            <a
              href={`${APP_URL}/login`}
              className="px-4 py-3 text-sm font-medium text-forest/70 hover:text-forest hover:bg-forest/5 rounded-lg transition-colors"
              onClick={() => setOpen(false)}
            >
              Log in
            </a>
            <a
              href={`${APP_URL}/register`}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-forest px-6 text-sm font-medium text-cream hover:bg-forest-light transition-colors"
              onClick={() => setOpen(false)}
            >
              Get Started
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}
