import { TESTIMONIALS } from '@/lib/constants/landing';

export function TestimonialsSection() {
  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="py-24 lg:py-40 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20 lg:mb-24">
          <h2 id="testimonials-heading" className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-6">
            Testimonials
          </h2>
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-foreground mb-6">
            Loved by owners
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Join hundreds of restaurants already growing with MenuBuildr.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <article 
              key={testimonial.customerName} 
              className="relative flex flex-col rounded-lg border border-input p-8 bg-white"
            >
              <div className="absolute top-10 right-10 text-6xl font-serif text-primary/10 select-none">
                &ldquo;
              </div>
              <blockquote className="relative flex-1 text-lg font-medium text-foreground leading-relaxed mb-8">
                {testimonial.quote}
              </blockquote>
              <div className="flex items-center gap-4 pt-8 border-t border-input/40">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg shadow-inner border border-primary/10">
                  {testimonial.customerName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight text-foreground">{testimonial.customerName}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{testimonial.restaurantName}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
