import { Nav } from '../components/nav/Nav';
import { Hero } from '../components/landing/Hero';
import { HeroSlideshow } from '../components/landing/HeroSlideshow';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FunnelSection } from '../components/landing/FunnelSection';
import { FeaturedListings } from '../components/landing/FeaturedListings';
import { DualBand } from '../components/landing/DualBand';
import { JeffSection } from '../components/landing/JeffSection';
import { Faq } from '../components/landing/Faq';
import { Footer } from '../components/landing/Footer';
import { fetchAllListings } from '../lib/listings/repository';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const all = await fetchAllListings();
  // 7 lowest-rate assumable homes for the hero slideshow.
  const slideshowListings = [...all]
    .filter((l) => l.isAssumable && l.loanType)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 7);

  return (
    <>
      <Nav />
      <Hero rightSlot={<HeroSlideshow listings={slideshowListings} />} />
      <HowItWorks />
      <FunnelSection />
      <FeaturedListings />
      <DualBand />
      <JeffSection />
      <Faq />
      <Footer />
    </>
  );
}
