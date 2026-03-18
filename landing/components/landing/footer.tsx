import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';

export function Footer() {
  return (
    <footer aria-label="Site footer" className="bg-forest text-cream border-t border-cream/5">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 pb-12 border-b border-cream/10">
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="font-serif text-2xl font-bold tracking-tight">
              MenuBuildr
            </span>
            <p className="mt-4 text-sm text-cream/50 leading-relaxed max-w-xs">
              The digital menu platform built for modern restaurant owners.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs tracking-widest text-cream/30 uppercase mb-4">
              Product
            </h3>
            <ul className="space-y-3" role="list">
              <li>
                <SmoothScrollLink href="#features" className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Features
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#templates" className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Templates
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#pricing" className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Pricing
                </SmoothScrollLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs tracking-widest text-cream/30 uppercase mb-4">
              Account
            </h3>
            <ul className="space-y-3" role="list">
              <li>
                <a href={`${APP_URL}/login`} className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Log in
                </a>
              </li>
              <li>
                <a href={`${APP_URL}/register`} className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Sign up
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs tracking-widest text-cream/30 uppercase mb-4">
              Legal
            </h3>
            <ul className="space-y-3" role="list">
              <li>
                <a href="/terms" className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-sm text-cream/60 hover:text-cream transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/30">
            &copy; {new Date().getFullYear()} MenuBuildr. All rights reserved.
          </p>
          <p className="font-mono text-[10px] tracking-widest text-cream/20 uppercase">
            Crafted with care
          </p>
        </div>
      </div>
    </footer>
  );
}
