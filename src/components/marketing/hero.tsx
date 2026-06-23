import Link from 'next/link';

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center px-[4%] pt-32 pb-20 overflow-hidden bg-navy">
      <div className="absolute -top-[180px] -right-[180px] w-[700px] h-[700px] rounded-full border-[90px] border-red opacity-[0.08] animate-[arcPulse_6s_ease-in-out_infinite]" />
      <div className="absolute -top-[80px] -right-[80px] w-[420px] h-[420px] rounded-full border-[3px] border-red opacity-[0.18] animate-[arcPulse_6s_ease-in-out_infinite_reverse]" />

      <div className="relative z-10 max-w-[680px]">
        <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-5 flex items-center gap-2.5">
          <span className="inline-block w-7 h-0.5 bg-red" />
          Founder-Led · AWS Expert · 5+ Years
        </p>
        <h1 className="font-[var(--font-sora)] text-[clamp(2.4rem,5.5vw,4rem)] font-extrabold leading-[1.12] tracking-tight mb-6 text-white">
          I Build Software That <span className="text-red">Scales Your Business</span>
        </h1>
        <p className="text-lg text-slate leading-relaxed mb-9 max-w-[560px]">
          AWS engineer who cut a client&apos;s cloud bill from $24K to $6K/month and rebuilt a hacked website into a secure, modern platform. I design, build, and deploy production-grade software and cloud infrastructure — on time, on budget, and built to last.
        </p>
        <div className="flex gap-4 flex-wrap">
          <Link
            href="#contact"
            className="bg-red text-white px-8 py-[0.85rem] rounded font-[var(--font-sora)] font-semibold text-sm tracking-wide no-underline hover:bg-red2 hover:-translate-y-0.5 transition-all"
          >
            Start a Project &rarr;
          </Link>
          <Link
            href="#work"
            className="border border-brand text-white px-8 py-[0.85rem] rounded font-[var(--font-sora)] font-semibold text-sm tracking-wide no-underline hover:border-white hover:-translate-y-0.5 transition-all"
          >
            View Our Work
          </Link>
        </div>
      </div>
    </section>
  );
}
