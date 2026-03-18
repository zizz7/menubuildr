import { HOW_IT_WORKS } from '@/lib/constants/landing';

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="py-24 lg:py-32 bg-forest text-cream"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">
            How It Works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-serif text-4xl lg:text-5xl font-bold mb-4"
          >
            Three simple steps
          </h2>
          <p className="text-cream/60">
            Get your digital menu live in minutes, not days.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="text-center md:text-left">
              <span className="font-mono text-5xl font-bold text-amber/30 block mb-4">
                {step.step}
              </span>
              <h3 className="font-serif text-2xl font-semibold mb-3">
                {step.title}
              </h3>
              <p className="text-cream/60 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
