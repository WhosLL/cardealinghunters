import { useState, useEffect } from 'react';
import { Search, Play, CheckCircle, XCircle, Loader, Globe, Car } from 'lucide-react';
import {
  scrapeCraigslist,
  processRawListings,
  getScraperSources,
  ScraperSource,
} from '../lib/apify';
import { supabase } from '../lib/supabase';

interface ScrapeJob {
  id: string;
  source: string;
  search_url: string;
  status: string;
  listings_added: number;
  started_at: string;
  completed_at: string | null;
}

export function AdminPage() {
  const sources = getScraperSources();
  const [selectedSource, setSelectedSource] = useState<ScraperSource>('craigslist');
  const [searchUrl, setSearchUrl] = useState(sources[0].defaultUrl);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [scrapeHistory, setScrapeHistory] = useState<ScrapeJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScrapeHistory();
  }, []);

  useEffect(() => {
    const source = sources.find(s => s.id === selectedSource);
    if (source) setSearchUrl(source.defaultUrl);
  }, [selectedSource]);

  const fetchScrapeHistory = async () => {
    const { data } = await supabase
      .from('scrape_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);
    if (data) setScrapeHistory(data);
  };

  const handleScrape = async () => {
    if (!searchUrl) return;
    setIsRunning(true);
    setError(null);
    setStatusMessage('Starting direct Craigslist scrape...');

    try {
      setStatusMessage('Fetching listings from Craigslist...');
      const rawListings = await scrapeCraigslist(searchUrl);

      if (!rawListings || rawListings.length === 0) {
        setStatusMessage('No listings found. Try a different URL.');
        setIsRunning(false);
        return;
      }

      setStatusMessage(`Found ${rawListings.length} raw listings. Processing and inserting...`);
      const insertedCount = await processRawListings(rawListings);

      // Record the scrape run
      await supabase.from('scrape_runs').insert({
        source: selectedSource,
        search_url: searchUrl,
        status: 'completed',
        listings_added: insertedCount,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      setStatusMessage(`Done! Inserted ${insertedCount} listings from ${rawListings.length} found.`);
      fetchScrapeHistory();
    } catch (err: any) {
      setError(err.message || 'Scrape failed');
      setStatusMessage('Scrape failed.');

      // Record failed run
      await supabase.from('scrape_runs').insert({
        source: selectedSource,
        search_url: searchUrl,
        status: 'failed',
        listings_added: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'craigslist': return '\ud83d\udcdd';
      case 'autotrader': return '\ud83d\ude97';
      case 'carscom': return '\ud83c\udfce\ufe0f';
      default: return '\ud83d\udd0d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'completed': case 'succeeded': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': case 'aborted': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Loader className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Search className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">Scrape Manager</h1>
      </div>

      {/* Source Selection */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Select Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedSource === source.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <div className="text-2xl mb-1">{getSourceIcon(source.id)}</div>
              <div className="text-white font-semibold">{source.name}</div>
              <div className="text-gray-400 text-xs mt-1 truncate">{source.defaultUrl.substring(0, 40)}...</div>
            </button>
          ))}
        </div>

        {/* Search URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search URL ({sources.find(s => s.id === selectedSource)?.name})
          </label>
          <input
            type="url"
            value={searchUrl}
            onChange={(e) => setSearchUrl(e.target.value)}
            placeholder="Paste a search URL..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <p className="text-gray-500 text-xs mt-2">
            Go to {sources.find(s => s.id === selectedSource)?.name}, search for cars with your filters, then paste the URL here.
          </p>
        </div>

        {/* Run Button */}
        <button
          onClick={handleScrape}
          disabled={isRunning || !searchUrl.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isRunning ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Scrape
            </>
          )}
        </button>

        {/* Status / Error Messages */}
        {statusMessage && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Scrape History */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Scrape History</h2>
        {scrapeHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No scrapes yet. Run your first one above!</p>
        ) : (
          <div className="space-y-3">
            {scrapeHistory.map((job) => (
              <div key={job.id} className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="text-white text-sm font-medium flex items-center gap-2">
                      <span>{getSourceIcon(job.source)}</span>
                      <span className="capitalize">{job.source === 'carscom' ? 'Cars.com' : job.source}</span>
                    </div>
                    <div className="text-gray-500 text-xs truncate max-w-md">{job.search_url}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 text-sm font-semibold">
                    {job.listings_added > 0 ? `+${job.listings_added} listings` : job.status}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(job.started_at).toLocaleDateString()} {new Date(job.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
