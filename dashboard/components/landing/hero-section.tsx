import Link from 'next/link';
import { SmoothScrollLink } from './smooth-scroll-link';

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="py-20 sm:py-32 bg-background relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--primary)_0%,transparent_25%)] opacity-[0.03] dark:opacity-[0.05]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="hero-heading"
            className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
          >
            Digital menus for modern restaurants
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Create, manage, and publish multilingual, allergen-safe menus 
            across all your locations with a single source of truth.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-foreground px-8 text-sm font-medium text-background hover:opacity-90 transition-all active:scale-[0.98] duration-150"
            >
              Start Building Free
            </Link>
            <SmoothScrollLink
              href="#pricing"
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-medium text-foreground hover:bg-surface transition-all active:scale-[0.98] duration-150"
            >
              View Plans
            </SmoothScrollLink>
          </div>
        </div>

        <div className="mt-20 sm:mt-24">
          <div className="mx-auto max-w-5xl rounded-lg border border-input bg-white overflow-hidden shadow-sm">
            <div className="aspect-[16/10] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-surface/50" />
              <div className="text-center p-8 relative">
                <p className="text-muted-foreground/60 text-sm font-medium tracking-wide">DASHBOARD PREVIEW</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
