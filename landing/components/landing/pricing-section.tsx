import { Check } from 'lucide-react';
import { PRICING_PLANS, APP_URL } from '@/lib/constants/landing';
import { cn } from '@/lib/utils';

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="py-24 lg:py-32 bg-cream-dark"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4"
          >
            Simple, transparent pricing
          </h2>
          <p className="text-warm-gray">
            No hidden fees. Start free, upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                'pricing-card relative flex flex-col rounded-2xl p-8 bg-white',
                plan.recommended
                  ? 'border-2 border-amber ring-1 ring-amber/20'
                  : 'border border-forest/5'
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber text-forest px-4 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="font-mono text-xs tracking-widest text-warm-gray uppercase mb-4">
                  {plan.name}
                </h3>
                <div className="flex items-baseline">
                  <span className="font-serif text-5xl font-bold text-forest">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="ml-1 text-sm text-warm-gray">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-8" role="list">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-forest/5 flex items-center justify-center text-forest shrink-0 mt-0.5">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <span className="text-sm text-warm-gray">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`${APP_URL}${plan.ctaHref}`}
                className={cn(
                  'inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-medium transition-colors',
                  plan.recommended
                    ? 'bg-forest text-cream hover:bg-forest-light'
                    : 'border border-forest/20 text-forest hover:bg-forest hover:text-cream'
                )}
              >
                {plan.ctaLabel}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
