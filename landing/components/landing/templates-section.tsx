import { TEMPLATES, APP_URL } from '@/lib/constants/landing';

export function TemplatesSection() {
  return (
    <section
      id="templates"
      aria-labelledby="templates-heading"
      className="py-24 lg:py-32 bg-cream-dark"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">
            Templates
          </p>
          <h2
            id="templates-heading"
            className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4"
          >
            Designed to impress
          </h2>
          <p className="text-warm-gray">
            Three professionally crafted templates to match any restaurant style.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {TEMPLATES.map((template) => (
            <div
              key={template.name}
              className="feature-card group rounded-2xl border border-forest/5 bg-white overflow-hidden"
            >
              <div className="aspect-[4/3] bg-forest/5 flex items-center justify-center relative overflow-hidden">
                <span className="font-serif text-2xl text-forest/20 italic">
                  {template.name}
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-xl font-semibold text-forest mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-warm-gray leading-relaxed">
                  {template.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href={`${APP_URL}/register`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-forest/20 px-8 text-sm font-medium text-forest hover:bg-forest hover:text-cream transition-colors"
          >
            Try All Templates Free
          </a>
        </div>
      </div>
    </section>
  );
}
