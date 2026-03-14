import { Check } from 'lucide-react';
import { PRICING_PLANS, APP_URL } from '@/lib/constants/landing';
import { cn } from '@/lib/utils';

export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24 lg:py-40 bg-input/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20 lg:mb-24">
          <h2 id="pricing-heading" className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-6">
            Simple Pricing
          </h2>
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-foreground mb-6">
            Choose your plan
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Transparent pricing for restaurants of all sizes. No hidden fees.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-[2.5rem] border p-10 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/5',
                plan.recommended 
                  ? 'border-primary bg-white shadow-xl scale-105 z-10' 
                  : 'border-input/40 bg-white/50 backdrop-blur-sm',
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                  Best Value
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-lg font-black uppercase tracking-widest text-foreground opacity-60 mb-4">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-5xl font-black tracking-tight text-foreground">{plan.price}</span>
                  {plan.period && <span className="ml-2 text-sm font-bold text-muted-foreground">{plan.period}</span>}
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-10" role="list">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-4">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5 border border-emerald-500/10">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`${APP_URL}${plan.ctaHref}`}
                className={cn(
                  'inline-flex h-14 items-center justify-center rounded-2xl px-8 text-sm font-black uppercase tracking-widest transition-all',
                  plan.recommended
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
                    : 'bg-input/10 text-foreground hover:bg-input/20',
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
