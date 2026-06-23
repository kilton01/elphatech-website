const steps = [
  { num: '01', title: 'Discovery', description: 'We learn your business, goals, and constraints before proposing anything.' },
  { num: '02', title: 'Planning', description: 'Scope, timeline, and architecture defined — no surprises.' },
  { num: '03', title: 'Build', description: 'Agile development with regular demos and clear communication.' },
  { num: '04', title: 'Deploy & Support', description: 'Smooth launch and ongoing support so you\'re never left behind.' },
];

export default function Process() {
  return (
    <section id="process" className="py-20 px-[4%] bg-navy">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            How We Work
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            A Process Built Around Your Goals
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 max-w-[1000px] mx-auto">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="relative px-6 py-6 text-center"
            >
              {i < steps.length - 1 && (
                <span className="hidden md:block absolute right-[-0.5rem] top-1/2 -translate-y-1/2 text-red text-xl">
                  &rarr;
                </span>
              )}
              <span className="font-[var(--font-sora)] text-[2.5rem] font-extrabold text-red/20 block leading-none">
                {step.num}
              </span>
              <h3 className="font-[var(--font-sora)] text-sm font-bold text-white mt-2 mb-1.5">
                {step.title}
              </h3>
              <p className="text-xs text-slate leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
