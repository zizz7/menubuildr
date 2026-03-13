import { TESTIMONIALS } from '@/lib/constants/landing';

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="py-20 sm:py-28 bg-white"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="testimonials-heading" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            What our customers say
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Feedback from restaurant owners using MenuBuildr.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <article
              key={testimonial.customerName}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <blockquote className="text-sm text-gray-600 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-900">{testimonial.customerName}</p>
                <p className="text-xs text-gray-500">{testimonial.restaurantName}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
