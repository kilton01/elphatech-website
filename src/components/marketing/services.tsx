import { Code2, Cloud, TrendingDown, Rocket, Database, MessageSquare } from 'lucide-react';

const services = [
  {
    icon: Code2,
    title: 'Software Development',
    description:
      'Custom web and mobile applications built with modern frameworks. I architect solutions that scale with your business from day one.',
  },
  {
    icon: Cloud,
    title: 'Cloud Consultation',
    description:
      'Strategic cloud advisory to help you migrate, modernize, and manage your infrastructure on AWS with confidence.',
  },
  {
    icon: TrendingDown,
    title: 'Cloud Cost Optimization',
    description:
      'I audit your cloud spend and implement proven strategies to cut costs by 30–60% without sacrificing performance or reliability.',
  },
  {
    icon: Rocket,
    title: 'Application Deployment',
    description:
      'CI/CD pipelines, containerization, and zero-downtime deployments. I take your app from code to production seamlessly.',
  },
  {
    icon: Database,
    title: 'Data Scraping & Extraction',
    description:
      'Automated data pipelines that collect, clean, and structure web data at scale — fueling your analytics, AI, and business intelligence.',
  },
  {
    icon: MessageSquare,
    title: 'Application Consultation',
    description:
      'Architecture reviews, technology audits, and roadmap planning. Get expert guidance before you write a single line of code.',
  },
];

export default function Services() {
  return (
    <section id="services" className="py-20 px-[4%] bg-navy">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            What We Do
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            End-to-End Technology Solutions
          </h2>
          <p className="text-slate mt-3 max-w-[520px] mx-auto">
            From bespoke software to cloud optimization — I handle the tech so you can focus on growth.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative bg-white/[0.04] border border-brand rounded-lg p-8 overflow-hidden transition-all duration-250 hover:border-red/35 hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
              <div className="w-12 h-12 bg-red/12 rounded-lg flex items-center justify-center mb-5">
                <service.icon size={22} className="text-red" />
              </div>
              <h3 className="font-[var(--font-sora)] text-base font-bold text-white mb-2.5">
                {service.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
