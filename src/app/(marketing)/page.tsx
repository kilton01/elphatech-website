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
import { testimonials, caseStudies, technologies } from '@/content/marketing';

export default function MarketingPage() {
  return (
    <>
      <Navigation />
      <Hero />
      <Services />
      <Work items={caseStudies} />
      <Process />
      <Testimonials items={testimonials} />
      <AboutFounder />
      <TechStack items={technologies} />
      <Contact />
      <Footer />
    </>
  );
}
