import { useState, useCallback } from 'react';
import { ListingCard } from '../components/ListingCard';
import { Filters } from '../components/Filters';
import { useListings, ListingsFilters } from '../hooks/useListings';
import {
  triggerApifyScrape,
  getApifyRunStatus,
  processAndInsertListings,
  getScraperSources,
  ScraperSource,
} from '../lib/apify';
import { supabase } from '../lib/supabase';

export function BrowsePage() {
  const [filters, setFilters] = useState<ListingsFilters>({});
  const { listings, loading, error, totalCount, viewedCount, handleLike, handleSkip } = useListings(filters);

  // Scrape state
  const sources = getScraperSources();
  const [showScrapePanel, setShowScrapePanel] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ScraperSource>('craigslist');
  const [scrapeUrl, setScrapeUrl] = useState(sources[0].defaultUrl);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [scrapeError, setScrapeError] = useState('');

  const handleFilterChange = (newFilters: ListingsFilters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters({});
  };

  const handleSourceChange = (sourceId: ScraperSource) => {
    setSelectedSource(sourceId);
    const source = sources.find(s => s.id === sourceId);
    if (source) setScrapeUrl(source.defaultUrl);
  };

  const handleScrape = useCallback(async () => {
    if (!scrapeUrl.trim() || scraping) return;
    setScraping(true);
    setScrapeError('');
    setScrapeStatus('Starting scrape...');

    try {
      const runId = await triggerApifyScrape(scrapeUrl, selectedSource);
      setScrapeStatus('Scraping in progress... this takes 1-3 minutes.');

      const pollInterval = setInterval(async () => {
        try {
          const statusData = await getApifyRunStatus(runId);
          const status = statusData.data?.status;

          if (status === 'SUCCEEDED') {
            clearInterval(pollInterval);
            setScrapeStatus('Processing results...');
            const datasetId = statusData.data.defaultDatasetId;
            const count = await processAndInsertListings(datasetId, runId, scrapeUrl, selectedSource);
            const sourceName = sources.find(s => s.id === selectedSource)?.name || selectedSource;
            setScrapeStatus(`Done! Added ${count} listings from ${sourceName}. Refresh filters to see them.`);
            setScraping(false);
            // Auto-refresh listings
            setFilters(prev => ({ ...prev }));
          } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
            clearInterval(pollInterval);
            setScrapeError(`Scrape ${status.toLowerCase()}. Try again or check Apify dashboard.`);
            setScraping(false);
          } else {
            setScrapeStatus(`Scraping... (${status})`);
          }
        } catch (pollErr) {
          console.error('Poll error:', pollErr);
        }
      }, 5000);

      // Safety timeout 5min
      setTimeout(() => {
        clearInterval(pollInterval);
        if (scraping) {
          setScrapeStatus('Taking longer than expected. Check back shortly.');
          setScraping(false);
        }
      }, 300000);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Failed to start scrape');
      setScraping(false);
    }
  }, [scrapeUrl, selectedSource, scraping, sources]);

  const handleClearAndScrape = useCallback(async () => {
    if (scraping) return;
    setScraping(true);
    setScrapeError('');
    setScrapeStatus('Clearing old listings...');
    try {
      await supabase.from('listings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setScrapeStatus('Old listings cleared. Starting fresh scrape...');
      setScraping(false);
      handleScrape();
    } catch (err) {
      setScrapeError('Failed to clear old listings');
      setScraping(false);
    }
  }, [scraping, handleScrape]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Find Great Car Deals</h1>
          <p className="text-gray-400">Showing {listings.length} of {totalCount} available listings</p>
        </div>
        <button
          onClick={() => setShowScrapePanel(!showScrapePanel)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            showScrapePanel
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {showScrapePanel ? 'Hide Scraper' : 'Fresh Scrape'}
        </button>
      </div>

      {/* Scrape Panel */}
      {showScrapePanel && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Source Selector */}
            <div className="flex gap-2">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceChange(source.id)}
                  disabled={scraping}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSource === source.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } disabled:opacity-50`}
                >
                  {source.name}
                </button>
              ))}
            </div>
          </div>

          {/* URL Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="url"
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              disabled={scraping}
              placeholder="Search URL..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            />
            <button
              onClick={handleScrape}
              disabled={scraping || !scrapeUrl.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors whitespace-nowrap"
            >
              {scraping ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Scraping...
                </>
              ) : (
                'Scrape Now'
              )}
            </button>
          </div>

          {/* Clear + Scrape option */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleClearAndScrape}
              disabled={scraping}
              className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50 disabled:no-underline"
            >
              Clear all old listings & scrape fresh
            </button>
            <span className="text-gray-600 text-xs">|</span>
            <p className="text-gray-500 text-xs">
              Paste any {sources.find(s => s.id === selectedSource)?.name} search URL, or use the default to scrape all cars.
            </p>
          </div>

          {/* Status messages */}
          {scrapeStatus && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
              {scrapeStatus}
            </div>
          )}
          {scrapeError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mt-2">
              {scrapeError}
            </div>
          )}
        </div>
      )}

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
          <p className="text-gray-500 mb-6">Try adjusting your filters or scrape fresh data</p>
          {!showScrapePanel && (
            <button
              onClick={() => setShowScrapePanel(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Scrape Fresh Listings
            </button>
          )}
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onLike={handleLike}
              onSkip={handleSkip}
            />
          ))}
        </div>
      )}
    </main>
  );
}
