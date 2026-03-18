import { TESTIMONIALS } from '@/lib/constants/landing';

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="py-24 lg:py-32 bg-cream"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">
            Testimonials
          </p>
          <h2
            id="testimonials-heading"
            className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4"
          >
            Loved by restaurateurs
          </h2>
          <p className="text-warm-gray">
            Join hundreds of restaurants already growing with MenuBuildr.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <article
              key={testimonial.customerName}
              className="feature-card rounded-2xl border border-forest/5 bg-white p-8 relative"
            >
              <div className="absolute top-6 right-8 font-serif text-6xl text-forest/5 select-none leading-none">
                &ldquo;
              </div>
              <blockquote className="relative text-forest/80 leading-relaxed mb-8">
                {testimonial.quote}
              </blockquote>
              <div className="flex items-center gap-4 pt-6 border-t border-forest/5">
                <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center text-cream font-serif font-bold text-lg">
                  {testimonial.customerName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-forest">
                    {testimonial.customerName}
                  </p>
                  <p className="text-xs text-warm-gray">
                    {testimonial.role}, {testimonial.restaurantName}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
