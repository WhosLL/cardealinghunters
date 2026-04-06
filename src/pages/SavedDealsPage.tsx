import { ListingCard } from '../components/ListingCard';
import { useSavedListings } from '../hooks/useListings';

export function SavedDealsPage() {
  const { savedListings: listings, loading, error, handleUnlike } = useSavedListings();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Saved Deals</h1>
        <p className="text-gray-400">You have {listings.length} saved {listings.length === 1 ? 'listing' : 'listings'}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-gray-400">Loading your saved deals...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {!loading && listings.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">No saved listings yet</p>
          <p className="text-gray-500">Go to <a href="/browse" className="text-blue-400 hover:text-blue-300">Browse</a> and like some listings to save them here</p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onLike={() => {}}
              onSkip={() => {}}
              onUnlike={handleUnlike}
              showUnlike={true}
            />
          ))}
        </div>
      )}
    </main>
  );
}

