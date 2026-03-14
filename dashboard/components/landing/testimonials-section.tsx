import { TESTIMONIALS } from '@/lib/constants/landing';

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="py-20 sm:py-32 bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="testimonials-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by the best
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Join hundreds of restaurants delivering a premium digital experience with MenuBuildr.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <article
              key={testimonial.customerName}
              className="rounded-lg border border-input bg-surface/30 p-8 transition-all hover:bg-surface/50"
            >
              <blockquote className="text-sm text-foreground/80 leading-relaxed italic">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-6 pt-6 border-t border-input">
                <p className="text-sm font-semibold text-foreground">{testimonial.customerName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{testimonial.restaurantName}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
