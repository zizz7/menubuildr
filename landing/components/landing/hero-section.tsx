import { APP_URL, SOCIAL_PROOF } from '@/lib/constants/landing';
import { SmoothScrollLink } from './smooth-scroll-link';

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden"
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-amber/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-sage/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <p className="font-mono text-xs tracking-widest text-forest/50 uppercase mb-6">
            The Digital Menu Platform
          </p>

          <h1
            id="hero-heading"
            className="font-serif text-5xl sm:text-6xl lg:text-8xl font-bold text-forest leading-[0.95] mb-8"
          >
            Menus crafted
            <br />
            for the <span className="italic text-amber">modern</span>
            <br />
            restaurant
          </h1>

          <p className="max-w-xl text-lg text-warm-gray leading-relaxed mb-10">
            Create beautiful, multi-language digital menus with allergen management.
            Built for restaurant owners who care about every detail.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
            <a
              href={`${APP_URL}/register`}
              className="inline-flex h-12 items-center justify-center rounded-full bg-forest px-8 text-sm font-medium text-cream hover:bg-forest-light transition-colors"
            >
              Start Building — It&apos;s Free
            </a>
            <SmoothScrollLink
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-forest/20 px-8 text-sm font-medium text-forest hover:bg-forest/5 transition-colors"
            >
              See How It Works
            </SmoothScrollLink>
          </div>
        </div>

        {/* Social proof bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-8 border-t border-b border-forest/10">
          {SOCIAL_PROOF.map((item) => (
            <span
              key={item}
              className="font-mono text-xs tracking-wider text-forest/40 uppercase"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
