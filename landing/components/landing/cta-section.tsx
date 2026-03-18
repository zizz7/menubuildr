import { APP_URL } from '@/lib/constants/landing';

export function CtaSection() {
  return (
    <section className="py-24 lg:py-32 bg-forest text-cream relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-amber/5 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-sage/5 blur-[80px]" />

      <div className="mx-auto max-w-3xl px-6 lg:px-10 text-center relative">
        <p className="font-mono text-xs tracking-widest text-amber uppercase mb-6">
          Ready to start?
        </p>
        <h2 className="font-serif text-4xl lg:text-6xl font-bold mb-6">
          Your menu,
          <br />
          <span className="italic text-amber">reimagined</span>
        </h2>
        <p className="text-cream/60 text-lg mb-10 max-w-lg mx-auto">
          Join hundreds of restaurants using MenuBuildr to create beautiful digital menus.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`${APP_URL}/register`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-amber px-8 text-sm font-medium text-forest hover:bg-amber-dark transition-colors"
          >
            Get Started Free
          </a>
          <a
            href={`${APP_URL}/login`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-cream/20 px-8 text-sm font-medium text-cream hover:bg-cream/10 transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    </section>
  );
}
