import { UtensilsCrossed } from 'lucide-react';
import { SmoothScrollLink } from './smooth-scroll-link';
import { APP_URL } from '@/lib/constants/landing';

export function Footer() {
  return (
    <footer aria-label="Site footer" className="border-t border-input/40 bg-background py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-10 pointer-events-none">
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 pb-16 border-b border-input/40">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="group flex items-center gap-3 font-black text-xl tracking-tight text-foreground transition-all">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center transition-colors hover:bg-primary/90">
                <UtensilsCrossed className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span>MenuBuildr</span>
            </a>
            <p className="mt-6 text-sm font-medium text-muted-foreground leading-relaxed max-w-xs">
              Next-generation digital menu operating system. Built for modern restaurant owners who demand excellence.
            </p>
          </div>
          
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground mb-6">Product</h3>
            <ul className="space-y-4" role="list">
              <li><SmoothScrollLink href="#features" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Features</SmoothScrollLink></li>
              <li><SmoothScrollLink href="#pricing" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Pricing</SmoothScrollLink></li>
              <li><SmoothScrollLink href="#testimonials" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Testimonials</SmoothScrollLink></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground mb-6">Account</h3>
            <ul className="space-y-4" role="list">
              <li><a href={`${APP_URL}/login`} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Log in</a></li>
              <li><a href={`${APP_URL}/register`} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Join Now</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground mb-6">Legal</h3>
            <ul className="space-y-4" role="list">
              <li><a href="/terms" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Terms</a></li>
              <li><a href="/privacy" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            &copy; {new Date().getFullYear()} MenuBuildr. Engineered for growth.
          </p>
          <div className="flex gap-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted/40">True Neutral Design System</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
