import { Store, LayoutTemplate, Languages, ShieldAlert } from 'lucide-react';
import { FEATURES } from '@/lib/constants/landing';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Store,
  LayoutTemplate,
  Languages,
  ShieldAlert,
};

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-20 sm:py-32 bg-gray-50/50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need for your menu
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Powerful, minimalist tools built for modern restaurant owners 
            who value clarity and efficiency.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <article
                key={feature.title}
                className="rounded-lg border border-input bg-background p-6 transition-all hover:border-primary/20 hover:bg-surface/50"
              >
                {Icon && <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />}
                <h3 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
