import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MarketComparison } from '../types/index';
import { getScoreColor } from '../lib/dealScore';
import { X, TrendingDown, TrendingUp, BarChart3, Users } from 'lucide-react';

interface PriceComparisonChartProps {
  listingId: string;
  onClose: () => void;
}

export function PriceComparisonChart({ listingId, onClose }: PriceComparisonChartProps) {
  const [data, setData] = useState<MarketComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, [listingId]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const { data: result, error: rpcError } = await supabase
        .rpc('get_listing_market_comparison', { p_listing_id: listingId });
      if (rpcError) throw rpcError;
      setData(result as MarketComparison);
    } catch (err: any) {
      setError(err?.message || 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.market || data.market.tier === 'none') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md text-center" onClick={e => e.stopPropagation()}>
          <p className="text-gray-400 mb-4">{error || 'Not enough market data for this vehicle yet.'}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Close</button>
        </div>
      </div>
    );
  }

  const { listing, market, similar_listings } = data;
  const score = listing.deal_score_numeric;
  const scoreColor = getScoreColor(score);
  const priceDiff = listing.price - (market.market_value || market.median_price);
  const priceDiffPct = market.market_value ? ((priceDiff / market.market_value) * 100).toFixed(0) : '0';
  const isBelowMarket = priceDiff < 0;

  // Calculate chart dimensions
  const prices = similar_listings.map(s => s.price);
  const minP = Math.min(...prices, listing.price) * 0.85;
  const maxP = Math.max(...prices, listing.price) * 1.05;
  const range = maxP - minP || 1;

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{listing.year} {listing.make} {listing.model}</h2>
            <p className="text-sm text-gray-400">Market Price Analysis</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Score Ring */}
        <div className="flex items-center gap-6 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isBelowMarket ? (
                <TrendingDown className="w-5 h-5 text-emerald-400" />
              ) : (
                <TrendingUp className="w-5 h-5 text-red-400" />
              )}
              <span className={`text-lg font-bold ${isBelowMarket ? 'text-emerald-400' : 'text-red-400'}`}>
                {isBelowMarket ? 'Below' : 'Above'} Market by {fmt(Math.abs(priceDiff))} ({Math.abs(Number(priceDiffPct))}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-gray-400">Listing Price:</div>
              <div className="text-white font-semibold">{fmt(listing.price)}</div>
              <div className="text-gray-400">Market Value:</div>
              <div className="text-white font-semibold">{fmt(market.market_value || market.median_price)}</div>
              <div className="text-gray-400">Data Source:</div>
              <div className="text-gray-300 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {market.sample_size} similar listings ({market.tier === 'exact' ? 'exact match' : market.tier === 'nearby_year' ? '±2 years' : 'all years'})
              </div>
            </div>
          </div>
        </div>

        {/* Price Range Bar */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-300">Price Range for {listing.year} {listing.make} {listing.model}</h3>
          </div>
          <div className="relative h-12 bg-slate-800 rounded-lg overflow-hidden border border-slate-700/50">
            {/* P25-P75 range highlight */}
            <div
              className="absolute top-0 bottom-0 bg-blue-900/40"
              style={{
                left: `${((market.p25_price - minP) / range) * 100}%`,
                width: `${((market.p75_price - market.p25_price) / range) * 100}%`,
              }}
            />
            {/* Median line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400"
              style={{ left: `${((market.median_price - minP) / range) * 100}%` }}
            />
            {/* This listing marker */}
            <div
              className="absolute top-1 bottom-1 w-1 rounded-full"
              style={{
                left: `${((listing.price - minP) / range) * 100}%`,
                backgroundColor: scoreColor,
                boxShadow: `0 0 8px ${scoreColor}`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{fmt(market.p25_price)} (25th)</span>
            <span className="text-blue-400">Median: {fmt(market.median_price)}</span>
            <span>{fmt(market.p75_price)} (75th)</span>
          </div>
        </div>

        {/* Similar Listings Scatter */}
        {similar_listings.length > 2 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Price Distribution — Similar Listings</h3>
            <div className="relative h-32 bg-slate-800 rounded-lg border border-slate-700/50 overflow-hidden">
              {similar_listings.map((sl, i) => {
                const x = ((sl.price - minP) / range) * 100;
                const y = 20 + Math.random() * 60; // scatter vertically
                return (
                  <div
                    key={i}
                    className={`absolute w-2.5 h-2.5 rounded-full transition-all ${
                      sl.is_current ? 'w-4 h-4 z-10 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      left: `${Math.max(2, Math.min(96, x))}%`,
                      top: `${y}%`,
                      backgroundColor: sl.is_current ? scoreColor : '#64748b',
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`${sl.title}: ${fmt(sl.price)}`}
                  />
                );
              })}
              {/* Market value line */}
              {market.market_value && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-400/50 border-l border-dashed border-blue-400/30"
                  style={{ left: `${(((market.market_value) - minP) / range) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scoreColor }} />
                This listing
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                Similar vehicles
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-blue-400" />
                Market value
              </div>
            </div>
          </div>
        )}

        {/* Mileage adjustment note */}
        {market.mileage_adjustment && Math.abs(market.mileage_adjustment) > 50 && (
          <p className="text-xs text-gray-500 italic">
            Market value adjusted by {fmt(Math.abs(market.mileage_adjustment))} for mileage ({new Intl.NumberFormat().format(listing.mileage)} mi vs avg {new Intl.NumberFormat().format(market.avg_mileage)} mi)
          </p>
        )}
      </div>
    </div>
  );
}
