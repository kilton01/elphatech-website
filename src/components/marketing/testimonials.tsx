type Testimonial = {
  id: string;
  quote: string;
  clientLabel: string;
  industry: string | null;
  clientSince: string | null;
  rating: number;
};

export default function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section id="testimonials" className="py-20 px-[4%] bg-navy2">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            Client Results
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            Don&apos;t Take My Word For It
          </h2>
        </div>

        <div className="grid grid-cols-1 max-w-[600px] mx-auto gap-7">
          {items.map((t) => (
            <div
              key={t.id}
              className="bg-white/[0.04] border border-brand rounded-lg p-8"
            >
              <div className="text-red text-sm mb-4 tracking-wider">
                {'★'.repeat(t.rating)}
              </div>
              <blockquote className="text-white/85 text-sm leading-relaxed italic mb-5">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red flex items-center justify-center font-[var(--font-sora)] font-bold text-sm text-white shrink-0">
                  {t.clientLabel
                    .split(/[\s—–-]+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-[var(--font-sora)] font-semibold text-sm text-white">
                    {t.clientLabel}
                  </div>
                  {t.clientSince && (
                    <div className="text-xs text-slate">
                      Client since {t.clientSince}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
