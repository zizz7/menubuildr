import Link from 'next/link';
import { Check } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants/landing';
import { cn } from '@/lib/utils';

export function PricingSection() {
  if (PRICING_PLANS.length === 0) {
    return (
      <section id="pricing" aria-labelledby="pricing-heading" className="py-20 sm:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="pricing-heading" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Pricing
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Pricing information is currently unavailable. Please contact support for details.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-20 sm:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Plans built for your growth
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Simple, honest pricing for restaurants of all sizes.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-lg border p-8 transition-all',
                plan.recommended ? 'border-primary ring-1 ring-primary/20 bg-surface/30' : 'border-input bg-background',
              )}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-sm">
                  Recommended
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="ml-1 text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="mt-8 flex-1 space-y-4" role="list">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={cn(
                  'mt-10 inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-medium transition-all active:scale-[0.98] duration-150',
                  plan.recommended
                    ? 'bg-primary text-primary-foreground hover:bg-primary/95'
                    : 'border border-input bg-background text-foreground hover:bg-surface',
                )}
              >
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
