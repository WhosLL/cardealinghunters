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
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [scrapeSources, setScrapeSources] = useState<any[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  useEffect(() => {
    fetchScrapeHistory();
    fetchScrapeSources();
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

    // FIX: capture the true start time before we do any work
    const startedAt = new Date().toISOString();

    try {
      setStatusMessage('Fetching listings from Craigslist...');
      const rawListings = await scrapeCraigslist(searchUrl);

      if (!rawListings || rawListings.length === 0) {
        setStatusMessage('No listings found. Try a different URL.');

        // FIX: still record this as a run so you can see empty attempts
        await supabase.from('scrape_runs').insert({
          source: selectedSource,
          search_url: searchUrl,
          status: 'completed',
          listings_added: 0,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });

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
        started_at: startedAt,
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
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleBackfill = async () => {
    setIsBackfilling(true);
    setBackfillStatus('Starting odometer backfill via Apify...');
    setError(null);

    try {
      let totalUpdated = 0;
      let totalProcessed = 0;
      let remaining = 1;
      let offset = 0;

      while (remaining > 0 && offset < 200) {
        setBackfillStatus(`Backfilling batch at offset ${offset}... (${totalUpdated} updated so far)`);
        const resp = await fetch(`/api/apify-backfill?batch=10&offset=${offset}`);
        const data = await resp.json();

        if (!resp.ok) {
          setError(data.error || 'Backfill failed');
          if (data.setup) setBackfillStatus(data.setup);
          break;
        }

        totalUpdated += data.updated || 0;
        totalProcessed += data.processed || 0;
        remaining = data.remaining || 0;
        offset += 10;

        if (data.processed === 0) break;
      }

      setBackfillStatus(`Done! Updated ${totalUpdated} listings with odometer data. ${remaining} still missing.`);
    } catch (err: any) {
      setError(err.message || 'Backfill failed');
      setBackfillStatus('');
    } finally {
      setIsBackfilling(false);
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

  const fetchScrapeSources = async () => {
    const { data } = await supabase.from('scrape_sources').select('*').order('name');
    if (data) setScrapeSources(data);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Running auto-sync: scraping all sources + checking expired...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/auto-sync', {
        headers: { 'Authorization': 'Bearer ' + (session?.access_token || '') },
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Sync failed');
      setSyncStatus(result.message);
      fetchScrapeHistory();
      fetchScrapeSources();
    } catch (err: any) {
      setSyncStatus('Error: ' + (err?.message || 'Sync failed'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl) return;
    const { error } = await supabase.from('scrape_sources').insert({
      name: newSourceName || new URL(newSourceUrl).hostname.split('.')[0],
      search_url: newSourceUrl,
    });
    if (!error) {
      setNewSourceName('');
      setNewSourceUrl('');
      fetchScrapeSources();
    }
  };

  const handleToggleSource = async (id: string, isActive: boolean) => {
    await supabase.from('scrape_sources').update({ is_active: !isActive }).eq('id', id);
    fetchScrapeSources();
  };

  const handleRemoveSource = async (id: string) => {
    await supabase.from('scrape_sources').delete().eq('id', id);
    fetchScrapeSources();
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupStatus('Checking listings for expired posts...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/cleanup-expired', {
        headers: { 'Authorization': 'Bearer ' + (session?.access_token || '') },
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Cleanup failed');
      setCleanupStatus(result.message);
    } catch (err: any) {
      setCleanupStatus('Error: ' + (err?.message || 'Cleanup failed'));
    } finally {
      setIsCleaningUp(false);
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

      {/* Odometer Backfill */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Odometer Backfill</h2>
        <p className="text-gray-400 text-sm mb-4">
          Fetches mileage data from individual Craigslist listing pages using Apify residential proxies.
          This fills in odometer data that search results don't include.
        </p>
        <button
          onClick={handleBackfill}
          disabled={isBackfilling}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isBackfilling ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Backfilling...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Odometer Backfill
            </>
          )}
        </button>
        {backfillStatus && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-300 text-sm">
            {backfillStatus}
          </div>
        )}
      </div>



      {/* Auto-Sync Pipeline */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Auto-Sync Pipeline</h2>
        <p className="text-gray-400 text-sm mb-4">
          Scrapes all active sources for new listings, removes expired posts, and refreshes market stats.
          Runs automatically every hour via cron.
        </p>
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors mb-4"
        >
          {isSyncing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Sync Now
            </>
          )}
        </button>
        {syncStatus && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
            {syncStatus}
          </div>
        )}

        {/* Scrape Sources List */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Scrape Sources ({scrapeSources.filter(s => s.is_active).length} active)</h3>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {scrapeSources.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${s.is_active ? 'text-white' : 'text-gray-500'}`}>{s.name}</span>
                  <p className="text-xs text-gray-500 truncate">{s.search_url}</p>
                  {s.last_scraped_at && <p className="text-xs text-gray-600">Last: {new Date(s.last_scraped_at).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button onClick={() => handleToggleSource(s.id, s.is_active)}
                    className={`text-xs px-2 py-1 rounded ${s.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                    {s.is_active ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => handleRemoveSource(s.id)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Source */}
          <div className="flex gap-2">
            <input value={newSourceName} onChange={e => setNewSourceName(e.target.value)}
              placeholder="Name" className="w-28 bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600" />
            <input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)}
              placeholder="Craigslist search URL" className="flex-1 bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600" />
            <button onClick={handleAddSource}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded font-medium">Add</button>
          </div>
        </div>
      </div>

      {/* Expired Listing Cleanup */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Expired Listing Cleanup</h2>
        <p className="text-gray-400 text-sm mb-4">
          Checks Craigslist listing URLs and deactivates expired/deleted posts. Also auto-expires anything older than 45 days.
        </p>
        <button
          onClick={handleCleanup}
          disabled={isCleaningUp}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isCleaningUp ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Cleanup
            </>
          )}
        </button>
        {cleanupStatus && (
          <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-orange-300 text-sm">
            {cleanupStatus}
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
