import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Car, BarChart3, Target, Clock, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Stats {
  totalListings: number;
  avgPrice: number;
  greatDeals: number;
  avgMileage: number;
  topMakes: { make: string; count: number }[];
  priceRanges: { range: string; count: number }[];
  recentActivity: { date: string; added: number }[];
  avgDaysListed: number;
  bestDealToday: { title: string; price: number; market_value: number; discount: number } | null;
}

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  async function fetchStats() {
    setLoading(true);
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const since = new Date(Date.now() - daysAgo * 86400000).toISOString();

    const { data: listings } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', since);

    if (!listings || listings.length === 0) {
      setStats({ totalListings: 0, avgPrice: 0, greatDeals: 0, avgMileage: 0, topMakes: [], priceRanges: [], recentActivity: [], avgDaysListed: 0, bestDealToday: null });
      setLoading(false);
      return;
    }

    const avgPrice = Math.round(listings.reduce((s, l) => s + l.price, 0) / listings.length);
    const avgMileage = Math.round(listings.reduce((s, l) => s + l.mileage, 0) / listings.length);
    const greatDeals = listings.filter(l => l.deal_score === 'great').length;

    // Top makes
    const makeCounts: Record<string, number> = {};
    listings.forEach(l => { makeCounts[l.make] = (makeCounts[l.make] || 0) + 1; });
    const topMakes = Object.entries(makeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([make, count]) => ({ make, count }));

    // Price ranges
    const ranges = [
      { range: '<$5k', min: 0, max: 5000 },
      { range: '$5-10k', min: 5000, max: 10000 },
      { range: '$10-20k', min: 10000, max: 20000 },
      { range: '$20-30k', min: 20000, max: 30000 },
      { range: '$30k+', min: 30000, max: Infinity },
    ];
    const priceRanges = ranges.map(r => ({
      range: r.range,
      count: listings.filter(l => l.price >= r.min && l.price < r.max).length,
    }));

    // Recent activity (last 7 days)
    const activityDays: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      activityDays[d] = 0;
    }
    listings.forEach(l => {
      const d = l.created_at.slice(0, 10);
      if (activityDays[d] !== undefined) activityDays[d]++;
    });
    const recentActivity = Object.entries(activityDays).map(([date, added]) => ({ date, added }));

    // Best deal
    const withDiscount = listings
      .filter(l => l.market_value && l.market_value > l.price)
      .map(l => ({ title: `${l.year} ${l.make} ${l.model}`, price: l.price, market_value: l.market_value!, discount: Math.round(((l.market_value! - l.price) / l.market_value!) * 100) }))
      .sort((a, b) => b.discount - a.discount);

    setStats({
      totalListings: listings.length,
      avgPrice, greatDeals, avgMileage, topMakes, priceRanges, recentActivity,
      avgDaysListed: Math.round(listings.reduce((s, l) => s + Math.max(1, (Date.now() - new Date(l.posted_at).getTime()) / 86400000), 0) / listings.length),
      bestDealToday: withDiscount[0] || null,
    });
    setLoading(false);
  }

  const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'dealer';

  if (!isPro) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
        <BarChart3 className="h-16 w-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Analytics Dashboard</h2>
        <p className="text-gray-400 text-center max-w-md mb-6">Get market insights, price trends, and deal analytics. Available on Pro and Dealer plans.</p>
        <a href="/pricing" className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-medium transition">Upgrade to Pro</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!stats) return null;

  const maxMakeCount = Math.max(...stats.topMakes.map(m => m.count), 1);
  const maxPriceCount = Math.max(...stats.priceRanges.map(r => r.count), 1);
  const maxActivity = Math.max(...stats.recentActivity.map(a => a.added), 1);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Market Analytics</h1>
            <p className="text-gray-400 mt-1">Real-time insights on the used car market</p>
          </div>
          <div className="flex bg-gray-900 rounded-lg border border-gray-800 p-1">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button key={range} onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${timeRange === range ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Car, label: 'Total Listings', value: stats.totalListings.toLocaleString(), color: 'text-blue-400' },
            { icon: DollarSign, label: 'Avg Price', value: `$${stats.avgPrice.toLocaleString()}`, color: 'text-green-400' },
            { icon: Star, label: 'Great Deals', value: stats.greatDeals.toString(), color: 'text-yellow-400' },
            { icon: Clock, label: 'Avg Days Listed', value: stats.avgDaysListed.toString(), color: 'text-purple-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Icon className={`h-4 w-4 ${color}`} /> {label}
              </div>
              <div className="text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>

        {/* Best deal highlight */}
        {stats.bestDealToday && (
          <div className="bg-gradient-to-r from-green-900/30 to-green-800/10 border border-green-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
              <Target className="h-4 w-4" /> Best Deal Found
            </div>
            <div className="text-xl font-bold">{stats.bestDealToday.title}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-green-400 font-bold text-lg">${stats.bestDealToday.price.toLocaleString()}</span>
              <span className="text-gray-400 line-through">${stats.bestDealToday.market_value.toLocaleString()}</span>
              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                {stats.bestDealToday.discount}% below market
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Makes */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="font-semibold mb-4">Top Makes</h3>
            <div className="space-y-3">
              {stats.topMakes.map(({ make, count }) => (
                <div key={make} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-gray-400 truncate">{make}</span>
                  <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxMakeCount) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price Distribution */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="font-semibold mb-4">Price Distribution</h3>
            <div className="flex items-end gap-2 h-40">
              {stats.priceRanges.map(({ range, count }) => (
                <div key={range} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{count}</span>
                  <div className="w-full bg-gray-800 rounded-t relative" style={{ height: `${Math.max(4, (count / maxPriceCount) * 100)}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" />
                  </div>
                  <span className="text-xs text-gray-500">{range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4">New Listings (Last 7 Days)</h3>
            <div className="flex items-end gap-3 h-32">
              {stats.recentActivity.map(({ date, added }) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{added}</span>
                  <div className="w-full bg-gray-800 rounded-t relative" style={{ height: `${Math.max(4, (added / maxActivity) * 100)}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t" />
                  </div>
                  <span className="text-xs text-gray-500">{new Date(date).toLocaleDateString('en', { weekday: 'short' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
