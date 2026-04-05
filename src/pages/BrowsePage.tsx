import { useState } from 'react';
import { ListingCard } from '../components/ListingCard';
import { Filters } from '../components/Filters';
import { useListings, ListingsFilters } from '../hooks/useListings';

export function BrowsePage() {
  const [filters, setFilters] = useState<ListingsFilters>({});
  const { listings, loading, error, totalCount, viewedCount, handleLike, handleSkip } = useListings(filters);

  const handleFilterChange = (newFilters: ListingsFilters) => { setFilters(newFilters); };
  const handleReset = () => { setFilters({}); };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Find Great Car Deals</h1>
        <p className="text-gray-400">Showing {listings.length} of {totalCount} available listings</p>
      </div>

      <Filters onFiltersChange={handleFilterChange} onReset={handleReset} />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-gray-400">Loading listings...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {!loading && listings.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">No listings available</p>
          <p className="text-gray-500">Try adjusting your filters or come back later</p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onLike={handleLike} onSkip={handleSkip} />
          ))}
        </div>
      )}
    </main>
  );
}
