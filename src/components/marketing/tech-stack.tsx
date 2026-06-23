const techs = [
  'AWS', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python',
  'PostgreSQL', 'Docker', 'Terraform', 'Redis',
];

export default function TechStack() {
  return (
    <section className="py-20 px-[4%] bg-navy">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            Technologies
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            Built With the Right Tools
          </h2>
          <p className="text-slate mt-3 max-w-[520px] mx-auto">
            I work with modern, battle-tested technologies — not hype.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-[800px] mx-auto">
          {techs.map((tech) => (
            <span
              key={tech}
              className="bg-white/[0.05] border border-brand rounded-full px-[1.1rem] py-[0.45rem] font-[var(--font-sora)] text-xs font-medium text-slate transition-colors hover:text-white hover:border-red"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
