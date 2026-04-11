import { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, Plus, Search, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SavedSearch {
  id: string;
  name: string;
  filters: {
    makes?: string[];
    minPrice?: number;
    maxPrice?: number;
    maxMileage?: number;
    locations?: string[];
    minDealScore?: string;
  };
  alerts_enabled: boolean;
  alert_method: 'email' | 'sms' | 'both';
  created_at: string;
  last_notified_at: string | null;
}

export default function SavedSearchesPage() {
  const { user, profile } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSearch, setNewSearch] = useState({
    name: '',
    makes: '',
    minPrice: '',
    maxPrice: '',
    maxMileage: '',
    locations: '',
    minDealScore: 'good',
    alertMethod: 'email' as 'email' | 'sms' | 'both',
  });

  useEffect(() => {
    if (user) fetchSearches();
  }, [user]);

  async function fetchSearches() {
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setSearches(data || []);
    setLoading(false);
  }

  async function createSearch() {
    if (!user || !newSearch.name.trim()) return;
    const filters: SavedSearch['filters'] = {};
    if (newSearch.makes) filters.makes = newSearch.makes.split(',').map(s => s.trim());
    if (newSearch.minPrice) filters.minPrice = Number(newSearch.minPrice);
    if (newSearch.maxPrice) filters.maxPrice = Number(newSearch.maxPrice);
    if (newSearch.maxMileage) filters.maxMileage = Number(newSearch.maxMileage);
    if (newSearch.locations) filters.locations = newSearch.locations.split(',').map(s => s.trim());
    if (newSearch.minDealScore) filters.minDealScore = newSearch.minDealScore;

    await supabase.from('saved_searches').insert({
      user_id: user.id,
      name: newSearch.name,
      filters,
      alerts_enabled: true,
      alert_method: newSearch.alertMethod,
    });
    setShowCreate(false);
    setNewSearch({ name: '', makes: '', minPrice: '', maxPrice: '', maxMileage: '', locations: '', minDealScore: 'good', alertMethod: 'email' });
    fetchSearches();
  }

  async function toggleAlerts(search: SavedSearch) {
    await supabase.from('saved_searches').update({ alerts_enabled: !search.alerts_enabled }).eq('id', search.id);
    fetchSearches();
  }

  async function deleteSearch(id: string) {
    await supabase.from('saved_searches').delete().eq('id', id);
    fetchSearches();
  }

  const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'dealer';
  const maxSearches = isPro ? 25 : 3;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Saved Searches</h1>
            <p className="text-gray-400 mt-1">Get notified when new deals match your criteria</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            disabled={searches.length >= maxSearches}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition">
            <Plus className="h-4 w-4" /> New Search
          </button>
        </div>

        {!isPro && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-sm">
            <span className="text-yellow-400 font-medium">Free tier:</span>{' '}
            <span className="text-gray-300">{searches.length}/{maxSearches} saved searches used. Upgrade to Pro for up to 25.</span>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
            <h3 className="font-semibold mb-4">Create New Search Alert</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400">Search Name</label>
                <input type="text" placeholder="e.g., Honda Civic under $15k"
                  value={newSearch.name} onChange={e => setNewSearch(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Makes (comma separated)</label>
                <input type="text" placeholder="Honda, Toyota, BMW"
                  value={newSearch.makes} onChange={e => setNewSearch(p => ({ ...p, makes: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Locations (comma separated)</label>
                <input type="text" placeholder="Los Angeles, Phoenix"
                  value={newSearch.locations} onChange={e => setNewSearch(p => ({ ...p, locations: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Min Price</label>
                <input type="number" placeholder="5000"
                  value={newSearch.minPrice} onChange={e => setNewSearch(p => ({ ...p, minPrice: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Max Price</label>
                <input type="number" placeholder="25000"
                  value={newSearch.maxPrice} onChange={e => setNewSearch(p => ({ ...p, maxPrice: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Max Mileage</label>
                <input type="number" placeholder="100000"
                  value={newSearch.maxMileage} onChange={e => setNewSearch(p => ({ ...p, maxMileage: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Min Deal Score</label>
                <select value={newSearch.minDealScore} onChange={e => setNewSearch(p => ({ ...p, minDealScore: e.target.value }))}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
                  <option value="great">Great Only</option>
                  <option value="good">Good & Above</option>
                  <option value="fair">Fair & Above</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">Alert Method</label>
                <div className="flex gap-2 mt-1">
                  {(['email', 'sms', 'both'] as const).map(method => (
                    <button key={method} onClick={() => setNewSearch(p => ({ ...p, alertMethod: method }))}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm border transition ${
                        newSearch.alertMethod === method ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-gray-700 text-gray-400'}`}>
                      {method === 'email' ? <Mail className="h-3 w-3" /> : method === 'sms' ? <MessageSquare className="h-3 w-3" /> : ''}
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createSearch} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-medium transition">Create Alert</button>
              <button onClick={() => setShowCreate(false)} className="px-6 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition">Cancel</button>
            </div>
          </div>
        )}

        {/* Searches list */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" /></div>
        ) : searches.length === 0 ? (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No saved searches yet</h3>
            <p className="text-gray-500 mt-1">Create a search alert to get notified when new deals match</p>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map(search => (
              <div key={search.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{search.name}</h3>
                    {search.alerts_enabled ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Paused</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {search.filters.makes?.map(m => (
                      <span key={m} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">{m}</span>
                    ))}
                    {search.filters.minPrice && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">Min ${search.filters.minPrice.toLocaleString()}</span>}
                    {search.filters.maxPrice && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">Max ${search.filters.maxPrice.toLocaleString()}</span>}
                    {search.filters.maxMileage && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">{`<${search.filters.maxMileage.toLocaleString()} mi`}</span>}
                    {search.filters.minDealScore && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">{search.filters.minDealScore}+ deals</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Alert via {search.alert_method} Â· Created {new Date(search.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => toggleAlerts(search)}
                    className={`p-2 rounded-lg border transition ${search.alerts_enabled ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-gray-700 text-gray-500 hover:text-white'}`}>
                    {search.alerts_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteSearch(search.id)}
                    className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
