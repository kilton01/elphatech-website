// Public site content. Edit here and redeploy.

export const testimonials = [
  {
    id: 't1',
    quote:
      'He took our hacked, broken website and turned it into something better than we ever had. Not only did he fix the security mess, he rebuilt the entire thing with a modern stack and added a mobile app feature we did not even ask for. We can finally run our business without worrying about getting hacked again.',
    clientLabel: 'Confidential — Logistics & Storage',
    industry: 'Logistics & Storage',
    clientSince: '2026',
    rating: 5,
  },
];

export const caseStudies = [
  {
    id: 'c1',
    category: 'WEBSITE SECURITY & MODERNIZATION',
    title: 'Logistics & Storage Company — Full Website Rescue',
    description:
      "A client's WordPress site was compromised — hackers had injected a betting platform into the database. I identified the breach, cleaned every backdoor, rebuilt the site as a headless WordPress + Next.js application, and created a custom security plugin to replace the vulnerable one.",
    outcome:
      'Client reclaimed their business — zero security issues since launch. Added PWA with push notifications for mobile customers.',
  },
  {
    id: 'c2',
    category: 'AWS COST OPTIMIZATION',
    title: 'Enterprise Client — Cloud Bill Cut by 75%',
    description:
      'Audited a sprawling multi-service AWS environment. Identified idle compute, over-provisioned databases, untagged resources, and misconfigured storage tiers. Implemented right-sizing, reserved instances, and automated scaling policies.',
    outcome: 'Monthly bill dropped from $24,000 to $6,000 — saving $216,000 per year.',
  },
];

export const technologies = [
  'AWS', 'TypeScript', 'React', 'Next.js', 'Node.js',
  'Python', 'PostgreSQL', 'Docker', 'Terraform', 'Redis',
].map((name) => ({ id: name, name }));
