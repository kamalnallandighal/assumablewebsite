import { Nav } from '../components/nav/Nav';
import { Hero } from '../components/landing/Hero';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero
        funnelSlot={
          <div className="rounded-card bg-cream p-8 text-muted text-sm">
            Funnel card placeholder — wired in Task 9
          </div>
        }
      />
      <Footer />
    </>
  );
}
