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
        className="relative group p-3 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+1rem)] left-0 right-0 glass rounded-[2.5rem] p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300 mx-6">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <SmoothScrollLink
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-6 py-4 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
              >
                {link.label}
              </SmoothScrollLink>
            ))}
            <div className="h-px bg-input/40 my-2 mx-6" />
            <a
              href={`${APP_URL}/login`}
              className="px-6 py-4 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
              onClick={() => setOpen(false)}
            >
              Log in
            </a>
            <a
              href={`${APP_URL}/register`}
              className="px-6 py-5 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-center shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2"
              onClick={() => setOpen(false)}
            >
              Join Now
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}
