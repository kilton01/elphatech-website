import Navigation from '@/components/marketing/navigation';
import Hero from '@/components/marketing/hero';
import Services from '@/components/marketing/services';
import Work from '@/components/marketing/work';
import Process from '@/components/marketing/process';
import Testimonials from '@/components/marketing/testimonials';
import AboutFounder from '@/components/marketing/about-founder';
import TechStack from '@/components/marketing/tech-stack';
import Contact from '@/components/marketing/contact';
import Footer from '@/components/marketing/footer';
import { db } from '@/lib/db';
import { testimonials, caseStudies, technologies } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const revalidate = 60;

async function getMarketingData() {
  const [testimonialsData, caseStudiesData, technologiesData] = await Promise.all([
    db.select().from(testimonials).where(eq(testimonials.status, 'published')).orderBy(asc(testimonials.position)),
    db.select().from(caseStudies).where(eq(caseStudies.status, 'published')).orderBy(asc(caseStudies.position)),
    db.select().from(technologies).where(eq(technologies.status, 'published')).orderBy(asc(technologies.position)),
  ]);

  return { testimonialsData, caseStudiesData, technologiesData };
}

export default async function MarketingPage() {
  const { testimonialsData, caseStudiesData, technologiesData } = await getMarketingData();

  return (
    <>
      <Navigation />
      <Hero />
      <Services />
      <Work items={caseStudiesData} />
      <Process />
      <Testimonials items={testimonialsData} />
      <AboutFounder />
      <TechStack items={technologiesData} />
      <Contact />
      <Footer />
    </>
  );
}
