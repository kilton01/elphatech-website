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
import { Toaster } from 'sonner';

export default function MarketingPage() {
  return (
    <>
      <Navigation />
      <Hero />
      <Services />
      <Work />
      <Process />
      <Testimonials />
      <AboutFounder />
      <TechStack />
      <Contact />
      <Footer />
      <Toaster
        position="top-right"
        richColors
        closeButton
      />
    </>
  );
}
