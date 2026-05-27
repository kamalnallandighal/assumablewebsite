import { Nav } from '../components/nav/Nav';
import { Hero } from '../components/landing/Hero';
import { FunnelCard } from '../components/landing/FunnelCard';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FeaturedListings } from '../components/landing/FeaturedListings';
import { DualBand } from '../components/landing/DualBand';
import { JeffSection } from '../components/landing/JeffSection';
import { Faq } from '../components/landing/Faq';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero funnelSlot={<FunnelCard />} />
      <HowItWorks />
      <FeaturedListings />
      <DualBand />
      <JeffSection />
      <Faq />
      <Footer />
    </>
  );
}
