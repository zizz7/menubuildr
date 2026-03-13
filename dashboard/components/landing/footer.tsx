import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';

export function Footer() {
  return (
    <footer aria-label="Site footer" className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>MenuBuildr</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Create and manage beautiful digital menus for your restaurants. Multi-language, allergen-safe, and easy to use.
            </p>
          </div>

          {/* Sections */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Product</h3>
            <ul className="mt-3 space-y-2" role="list">
              <li>
                <SmoothScrollLink href="#features" className="text-sm text-gray-500 hover:text-gray-700">
                  Features
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#pricing" className="text-sm text-gray-500 hover:text-gray-700">
                  Pricing
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#testimonials" className="text-sm text-gray-500 hover:text-gray-700">
                  Testimonials
                </SmoothScrollLink>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Account</h3>
            <ul className="mt-3 space-y-2" role="list">
              <li>
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-500 hover:text-gray-700">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="mt-3 space-y-2" role="list">
              <li>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MenuBuildr. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
