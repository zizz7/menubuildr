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
      className="py-20 sm:py-28 bg-gray-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Everything you need to manage your menus
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Powerful tools built for restaurant owners and managers.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <article
                key={feature.title}
                className="rounded-lg border border-gray-200 bg-white p-6"
              >
                {Icon && <Icon className="h-5 w-5 text-gray-900" aria-hidden="true" />}
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
