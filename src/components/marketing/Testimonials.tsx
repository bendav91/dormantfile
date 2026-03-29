interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

// Add testimonials here as they come in.
// Component renders nothing until this array is populated.
const testimonials: Testimonial[] = [];

export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section className="py-16 px-6">
      <div className="max-w-[960px] mx-auto">
        <h2
          className="text-xl font-bold text-center mb-10"
          style={{ color: "var(--color-text-primary)" }}
        >
          What our users say
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: "var(--color-text-body)" }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)", margin: 0 }}
                >
                  {t.name}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: 0 }}>
                  {t.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
