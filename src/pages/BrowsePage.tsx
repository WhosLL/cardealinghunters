import { useState } from 'react';
import { useListings, ListingsFilters, SortOption } from '../hooks/useListings';
import { Filters } from '../components/Filters';
import { ListingCard } from '../components/ListingCard';
import { RefreshCw, Loader, Search } from 'lucide-react';
import { UpgradeBanner } from '../components/UpgradeBanner';

export function BrowsePage() {
  const [filters, setFilters] = useState<ListingsFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const { listings, loading, error, totalCount, handleLike, handleSkip, refetch, loadMore, hasMore, handleContact } = useListings(filters);

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Your Deal Feed
          </h1>
          <p className="text-lg text-gray-400 mb-6">
            {totalCount > 0 ? (
              <>
                Showing <span className="font-semibold text-blue-400">{listings.length}</span> of{' '}
                <span className="font-semibold text-purple-400">{totalCount}</span> listings
              </>
            ) : (
              'No listings yet. Seed demo data to get started.'
            )}
          </p>

          {/* Search + Sort + Refresh */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={e => {
                  setSearchInput(e.target.value);
                  setFilters(prev => ({ ...prev, search: e.target.value || undefined }));
                }}
                placeholder="Search by make, model, or keyword..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => {
                const val = e.target.value as SortOption;
                setSortBy(val);
                setFilters(prev => ({ ...prev, sort: val }));
              }}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="mileage_asc">Mileage: Low to High</option>
              <option value="mileage_desc">Mileage: High to Low</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-gray-300 font-semibold rounded-lg transition-all duration-200 border border-slate-700 hover:border-slate-600"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

        </div>
      </div>

      {/* Filters Section */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Filters onFiltersChange={(f: ListingsFilters) => setFilters(f)} onReset={() => setFilters({})} />
        </div>
      </div>

      {/* Upgrade Banner for free tier */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <UpgradeBanner />
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-6 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-center">
            {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 h-96 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Listings grid */}
      {!loading && listings.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onLike={handleLike}
                onSkip={handleSkip}
              onContact={handleContact}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && listings.length === 0 && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-300 mb-3">No listings found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your filters or seed demo data to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
