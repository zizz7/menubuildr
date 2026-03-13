'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
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
        className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-50">
          <nav className="flex flex-col p-4 gap-2">
            {NAV_LINKS.map((link) => (
              <SmoothScrollLink
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-md text-base font-medium"
              >
                {link.label}
              </SmoothScrollLink>
            ))}
            <hr className="my-2" />
            <a
              href={`${APP_URL}/login`}
              className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-md text-base font-medium"
              onClick={() => setOpen(false)}
            >
              Log in
            </a>
            <a
              href={`${APP_URL}/register`}
              className="px-4 py-3 bg-primary text-primary-foreground rounded-md text-base font-medium text-center"
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
