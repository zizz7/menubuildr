import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="py-20 sm:py-28 bg-white"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1
            id="hero-heading"
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
          >
            Digital menus for your restaurants
          </h1>
          <p className="mt-4 text-base text-gray-500 leading-relaxed sm:text-lg">
            Create, manage, and publish menus across all your locations.
            Multi-language, allergen-safe, and ready to share.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`${APP_URL}/register`}
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Get Started
            </a>
            <SmoothScrollLink
              href="#pricing"
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              See Pricing
            </SmoothScrollLink>
          </div>
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-gray-400 text-sm">Menu Builder Interface Preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
