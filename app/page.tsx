import { Nav } from '../components/nav/Nav';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <main className="p-8 space-y-4">
        <h1 className="font-serif text-5xl text-ink">Assumable Homes</h1>
        <p className="text-muted">Design tokens wired.</p>
        <button className="bg-terra text-white px-4 py-2 rounded-pill">Find your home</button>
      </main>
      <Footer />
    </>
  );
}
