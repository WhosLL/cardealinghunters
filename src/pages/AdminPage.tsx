import { useState } from 'react';
import { Shield, Play, RefreshCw, CheckCircle, XCircle, Clock, Link } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { triggerApifyScrape, getApifyRunStatus, getApifyDataset, processAndInsertListings } from '../lib/apify';

interface ScrapeJob {
  id: string;
  url: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  listingsFound?: number;
}

export function AdminPage() {
  const { profile } = useAuth();
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartScrape = async () => {
    if (!scrapeUrl.trim()) {
      setError('Please enter a Craigslist search URL');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const runId = await triggerApifyScrape(scrapeUrl);
      const newJob: ScrapeJob = {
        id: runId,
        url: scrapeUrl,
        status: 'running',
        startedAt: new Date().toISOString(),
      };
      setJobs(prev => [newJob, ...prev]);
      setScrapeUrl('');
      pollJob(runId);
    } catch (err: any) {
      setError(err.message || 'Failed to start scrape');
    } finally {
      setLoading(false);
    }
  };

  const pollJob = async (runId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getApifyRunStatus(runId);
        if (status.status === 'SUCCEEDED') {
          clearInterval(interval);
          try {
            const data = await getApifyDataset(status.defaultDatasetId);
            const count = await processAndInsertListings(data);
            setJobs(prev =>
              prev.map(j =>
                j.id === runId ? { ...j, status: 'succeeded', listingsFound: count } : j
              )
            );
          } catch {
            setJobs(prev =>
              prev.map(j =>
                j.id === runId ? { ...j, status: 'succeeded', listingsFound: 0 } : j
              )
            );
          }
        } else if (status.status === 'FAILED' || status.status === 'ABORTED') {
          clearInterval(interval);
          setJobs(prev =>
            prev.map(j => (j.id === runId ? { ...j, status: 'failed' } : j))
          );
        }
      } catch {
        clearInterval(interval);
        setJobs(prev =>
          prev.map(j => (j.id === runId ? { ...j, status: 'failed' } : j))
        );
      }
    }, 5000);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'succeeded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Trigger Scrape */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trigger New Scrape</h2>
          <p className="text-gray-400 mb-4">Enter a Craigslist search URL to scrape listings from.</p>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="url"
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                placeholder="https://sfbay.craigslist.org/search/cta"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleStartScrape}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5" />
              {loading ? 'Starting...' : 'Start Scrape'}
            </button>
          </div>
        </div>

        {/* Scrape History */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Scrape History</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No scrapes yet. Trigger one above to get started.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(job.status)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-md">{job.url}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(job.startedAt).toLocaleString()}
                        {job.listingsFound !== undefined && (
                          <span className="ml-2 text-green-400">• {job.listingsFound} listings found</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    job.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                    job.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}