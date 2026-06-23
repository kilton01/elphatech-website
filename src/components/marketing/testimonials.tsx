const testimonials = [
  {
    quote: "\"He took our hacked, broken website and turned it into something better than we ever had. Not only did he fix the security mess, he rebuilt the entire thing with a modern stack and added a mobile app feature we did not even ask for. We can finally run our business without worrying about getting hacked again.\"",
    initials: 'CL',
    name: 'Confidential — Logistics & Storage',
    title: 'Client since 2026',
  },
];

export default function Testimonials() {
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

        <div className="grid grid-cols-1 max-w-[600px] mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white/[0.04] border border-brand rounded-lg p-8"
            >
              <div className="text-red text-sm mb-4 tracking-wider">
                ★★★★★
              </div>
              <blockquote className="text-white/85 text-sm leading-relaxed italic mb-5">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red flex items-center justify-center font-[var(--font-sora)] font-bold text-sm text-white shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="font-[var(--font-sora)] font-semibold text-sm text-white">
                    {t.name}
                  </div>
                  <div className="text-xs text-slate">
                    {t.title}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
