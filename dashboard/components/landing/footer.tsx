import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';

export function Footer() {
  return (
    <footer aria-label="Site footer" className="border-t bg-surface/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
              <UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>MenuBuildr</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Empowering restaurants with premium, functional digital menus. 
              Designed for humans, built for scale.
            </p>
          </div>

          {/* Sections */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Product</h3>
            <ul className="mt-4 space-y-3" role="list">
              <li>
                <SmoothScrollLink href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Testimonials
                </SmoothScrollLink>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Account</h3>
            <ul className="mt-4 space-y-3" role="list">
              <li>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Legal</h3>
            <ul className="mt-4 space-y-3" role="list">
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 sm:mt-24 border-t border-input pt-8 text-center">
          <p className="text-xs text-muted-foreground/60 tracking-wider font-medium">
            &copy; {new Date().getFullYear()} MENUBUILDR. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
