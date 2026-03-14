import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';
import { UtensilsCrossed } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20 lg:mb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next-Gen Menu OS
          </div>
          
          <h1 id="hero-heading" className="text-5xl lg:text-8xl font-black tracking-tight text-foreground mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Digital menus <br/>
            <span className="text-primary italic">reimagined.</span>
          </h1>
          
          <p className="max-w-xl text-lg lg:text-xl text-muted-foreground leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The all-in-one platform for modern restaurant owners. 
            Beautiful, efficient, and built for growth.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <a
              href={`${APP_URL}/register`}
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started Free
            </a>
            <SmoothScrollLink
              href="#pricing"
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              View Plans
            </SmoothScrollLink>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl mt-16">
          <div className="rounded-lg border border-input bg-white p-2">
            <div className="rounded-md border border-input bg-background overflow-hidden aspect-[16/10] relative">
              <div className="absolute inset-0 flex items-center justify-center p-20">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-input/20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-500">
                    <UtensilsCrossed className="h-10 w-10 text-muted" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-muted/40 italic">Interface Preview Loading...</p>
                </div>
              </div>
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/20" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
