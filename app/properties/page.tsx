import { PropertiesView } from './PropertiesView';
import { fetchAllListings } from '../../lib/listings/repository';

// Server-side preload. Hits Supabase if env vars are set, else falls back to
// the JSON fixture. Passes the result down to the client view.
//
// `dynamic = 'force-dynamic'` because the underlying URL state (nuqs) is
// already disabling static prerender; making this explicit keeps build output
// predictable and ensures fresh data on every nav.
export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const listings = await fetchAllListings();
  return <PropertiesView initialListings={listings} />;
}
