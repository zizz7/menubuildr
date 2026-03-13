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
    <section id="pricing" aria-labelledby="pricing-heading" className="py-20 sm:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="pricing-heading" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Pricing
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Choose the plan that fits your restaurant business.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-lg border bg-white p-8',
                plan.recommended ? 'border-gray-900' : 'border-gray-200',
              )}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                  Recommended
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                {plan.period && <span className="ml-1 text-gray-500">{plan.period}</span>}
              </div>
              <ul className="mt-8 flex-1 space-y-3" role="list">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={cn(
                  'mt-8 inline-flex h-12 items-center justify-center rounded-md px-6 text-sm font-medium transition-colors',
                  plan.recommended
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
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
