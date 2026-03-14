import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';
import { UtensilsCrossed } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-orange-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

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
              className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-2xl bg-primary px-10 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-2xl shadow-primary/40 hover:bg-primary/90 hover:scale-[1.05] active:scale-[0.98] transition-all"
            >
              Get Started Free
            </a>
            <SmoothScrollLink
              href="#pricing"
              className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-2xl border border-input/40 bg-background/50 backdrop-blur-md px-10 text-sm font-bold text-foreground hover:bg-input/20 transition-all"
            >
              View Plans
            </SmoothScrollLink>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl animate-in fade-in zoom-in duration-1000 delay-500">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 rounded-[3rem]" />
          <div className="rounded-[2.5rem] border border-input/40 bg-white/40 backdrop-blur-md p-4 lg:p-6 shadow-2xl">
            <div className="rounded-[2rem] border border-input/40 bg-background/80 overflow-hidden shadow-inner aspect-[16/10] relative group">
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
