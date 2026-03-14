import { Store, LayoutTemplate, Languages, ShieldAlert } from 'lucide-react';
import { FEATURES } from '@/lib/constants/landing';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Store, LayoutTemplate, Languages, ShieldAlert,
};

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-heading" className="py-24 lg:py-40 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20 lg:mb-24">
          <h2 id="features-heading" className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-6">
            Core Features
          </h2>
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-foreground mb-6">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Powerful tools built for restaurant owners and managers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <article 
                key={feature.title} 
                className="group relative rounded-[2rem] border border-input bg-white p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-input/10 flex items-center justify-center text-primary mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground shadow-inner">
                  {Icon && <Icon className="h-6 w-6" aria-hidden="true" />}
                </div>
                <h3 className="text-lg font-black tracking-tight text-foreground mb-3">{feature.title}</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">{feature.description}</p>
                
                {/* Subtle underline animation */}
                <div className="absolute bottom-6 left-8 right-8 h-px bg-primary/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
