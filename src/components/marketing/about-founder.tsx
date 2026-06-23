import { Shield, Award, Code2 } from 'lucide-react';

export default function AboutFounder() {
  return (
    <section id="about-founder" className="py-20 px-[4%] bg-navy">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            About
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            The Engineer Behind the Work
          </h2>
        </div>

        <div className="max-w-[700px] mx-auto">
          <div className="bg-white/[0.04] border border-brand rounded-lg p-8 md:p-10">
            <h3 className="font-[var(--font-sora)] text-xl font-bold text-white mb-4">
              Stephen — Founder & Lead Engineer
            </h3>
            <p className="text-slate leading-relaxed mb-6">
              I started ElphaTech Solutions after 5+ years of building production systems and managing AWS infrastructure for companies across logistics, e-commerce, and enterprise SaaS. Every project I take on gets my direct attention — no hand-offs, no junior devs learning on your dime.
            </p>
            <p className="text-slate leading-relaxed mb-8">
              I specialize in the intersection of software engineering and cloud infrastructure: building apps that are fast, secure, and affordable to run at scale.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-md px-4 py-3">
                <Shield size={18} className="text-red shrink-0" />
                <span className="text-sm text-white font-medium">AWS Certified</span>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-md px-4 py-3">
                <Code2 size={18} className="text-red shrink-0" />
                <span className="text-sm text-white font-medium">Full-Stack</span>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-md px-4 py-3">
                <Award size={18} className="text-red shrink-0" />
                <span className="text-sm text-white font-medium">100% Retention</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
