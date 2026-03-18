import { Store, LayoutTemplate, Languages, ShieldAlert, QrCode, Palette } from 'lucide-react';
import { FEATURES } from '@/lib/constants/landing';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Store, LayoutTemplate, Languages, ShieldAlert, QrCode, Palette,
};

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-24 lg:py-32 bg-cream relative"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">
            Features
          </p>
          <h2
            id="features-heading"
            className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4"
          >
            Everything you need
          </h2>
          <p className="text-warm-gray">
            Powerful tools designed for restaurant owners and managers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <article
                key={feature.title}
                className="feature-card group rounded-2xl border border-forest/5 bg-white p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-forest/5 flex items-center justify-center text-forest mb-6 group-hover:bg-forest group-hover:text-cream transition-colors duration-300">
                  {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                </div>
                <h3 className="font-serif text-xl font-semibold text-forest mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-warm-gray leading-relaxed">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
