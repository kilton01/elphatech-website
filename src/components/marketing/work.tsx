type CaseStudy = {
  id: string;
  category: string;
  title: string;
  description: string;
  outcome: string;
};

export default function Work({ items }: { items: CaseStudy[] }) {
  if (items.length === 0) return null;

  return (
    <section id="work" className="py-20 px-[4%] bg-navy2">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            Recent Work
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            Real Problems. Real Results.
          </h2>
          <p className="text-slate mt-3 max-w-[520px] mx-auto">
            Here is what I have been building. Names withheld for client privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-[800px] mx-auto">
          {items.map((project) => (
            <div
              key={project.id}
              className="bg-white/[0.04] border border-brand rounded-lg p-8 transition-all duration-250 hover:-translate-y-1 hover:border-red/30"
            >
              <span className="inline-block bg-red/12 text-red text-[0.72rem] font-semibold font-[var(--font-sora)] tracking-wide uppercase px-2.5 py-1 rounded-sm mb-4">
                {project.category}
              </span>
              <h3 className="font-[var(--font-sora)] text-base font-bold text-white mb-2">
                {project.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed mb-5">
                {project.description}
              </p>
              <div className="text-xs text-slate border-t border-brand pt-4">
                Outcome: <strong className="text-red font-semibold">{project.outcome}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
