export default function StatsBar() {
  const stats = [
    { num: '75', suffix: '%', label: 'Cloud Cost Reduction' },
    { num: '$216', suffix: 'K', label: 'Saved Per Year for Clients' },
    { num: '0', suffix: '', label: 'Security Incidents Post-Launch' },
    { num: '5', suffix: '+', label: 'Years Building on AWS' },
  ];

  return (
    <div className="bg-navy2 border-y border-brand py-10 px-[4%]">
      <div className="max-w-6xl mx-auto flex justify-around flex-wrap gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <span className="font-[var(--font-sora)] text-[2.2rem] font-extrabold text-white block leading-none">
              {stat.num}<span className="text-red">{stat.suffix}</span>
            </span>
            <div className="text-xs text-slate uppercase tracking-widest mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
