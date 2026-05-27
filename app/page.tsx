import { Nav } from '../components/nav/Nav';
import { Hero } from '../components/landing/Hero';
import { FunnelCard } from '../components/landing/FunnelCard';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero funnelSlot={<FunnelCard />} />
      <Footer />
    </>
  );
}
