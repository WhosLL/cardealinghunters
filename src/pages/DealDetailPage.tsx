import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart, Share2, Calculator, Car, MapPin, Calendar, Gauge, DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DealScoreBadge } from '../components/DealScoreBadge';
import type { Listing } from '../types';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showProfitCalc, setShowProfitCalc] = useState(false);
  const [profitInputs, setProfitInputs] = useState({
    purchasePrice: 0,
    repairCost: 0,
    transportCost: 200,
    listingFees: 50,
    targetSellPrice: 0,
  });

  useEffect(() => {
    if (id) fetchListing();
  }, [id]);

  async function fetchListing() {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      setListing(data);
      setProfitInputs(prev => ({
        ...prev,
        purchasePrice: data.price,
        targetSellPrice: data.market_value || Math.round(data.price * 1.15),
      }));
    }
    // Check if saved
    if (user) {
      const { data: action } = await supabase
        .from('user_actions')
        .select('action')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .eq('action', 'like')
        .maybeSingle();
      setIsSaved(!!action);
    }
    setLoading(false);
  }

  async function toggleSave() {
    if (!user || !listing) return;
    if (isSaved) {
      await supabase.from('user_actions').delete()
        .eq('user_id', user.id).eq('listing_id', listing.id).eq('action', 'like');
    } else {
      await supabase.from('user_actions').insert({
        user_id: user.id, listing_id: listing.id, action: 'like'
      });
    }
    setIsSaved(!isSaved);
  }

  const totalCosts = profitInputs.purchasePrice + profitInputs.repairCost + profitInputs.transportCost + profitInputs.listingFees;
  const estimatedProfit = profitInputs.targetSellPrice - totalCosts;
  const profitMargin = profitInputs.targetSellPrice > 0 ? (estimatedProfit / profitInputs.targetSellPrice) * 100 : 0;
  const roi = totalCosts > 0 ? (estimatedProfit / totalCosts) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Listing Not Found</h2>
        <button onClick={() => navigate('/browse')} className="text-green-400 hover:underline">Back to Browse</button>
      </div>
    );
  }

  const discount = listing.market_value ? Math.round(((listing.market_value - listing.price) / listing.market_value) * 100) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back nav */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
              {listing.image_url ? (
                <img src={listing.image_url.startsWith('http') ? `/api/image-proxy?url=${encodeURIComponent(listing.image_url)}` : listing.image_url}
                  alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="h-24 w-24 text-gray-700" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <DealScoreBadge score={listing.deal_score} size="lg" />
              </div>
            </div>

            {/* Title & actions */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{listing.year} {listing.make} {listing.model}</h1>
                <p className="text-gray-400 mt-1">{listing.title}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={toggleSave}
                  className={`p-3 rounded-lg border transition ${isSaved ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
                  <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
                <button onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="p-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, label: 'Price', value: `$${listing.price.toLocaleString()}` },
                { icon: Gauge, label: 'Mileage', value: `${listing.mileage.toLocaleString()} mi` },
                { icon: MapPin, label: 'Location', value: listing.location },
                { icon: Calendar, label: 'Posted', value: new Date(listing.posted_at).toLocaleDateString() },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Icon className="h-4 w-4" /> {label}
                  </div>
                  <div className="font-semibold truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-gray-300 whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Source link */}
            <a href={listing.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-green-400 hover:text-green-300 transition">
              <ExternalLink className="h-4 w-4" /> View Original on {listing.source}
            </a>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price card */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="text-3xl font-bold text-green-400">${listing.price.toLocaleString()}</div>
              {listing.market_value && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Market Value</span>
                    <span>${listing.market_value.toLocaleString()}</span>
                  </div>
                  {discount !== null && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${discount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {discount > 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {Math.abs(discount)}% {discount > 0 ? 'below' : 'above'} market
                    </div>
                  )}
                  {/* Price bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                        style={{ width: `${Math.min(100, (listing.price / listing.market_value) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>$0</span><span>${listing.market_value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profit Calculator */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <button onClick={() => setShowProfitCalc(!showProfitCalc)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-2 font-semibold">
                  <Calculator className="h-5 w-5 text-green-400" /> Profit Calculator
                </div>
                <span className="text-gray-400">{showProfitCalc ? 'â' : '+'}</span>
              </button>

              {showProfitCalc && (
                <div className="px-4 pb-4 space-y-3">
                  {[
                    { key: 'purchasePrice' as const, label: 'Purchase Price' },
                    { key: 'repairCost' as const, label: 'Est. Repairs' },
                    { key: 'transportCost' as const, label: 'Transport' },
                    { key: 'listingFees' as const, label: 'Listing Fees' },
                    { key: 'targetSellPrice' as const, label: 'Target Sell Price' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-sm text-gray-400">{label}</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input type="number" value={profitInputs[key]}
                          onChange={e => setProfitInputs(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-gray-700 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Investment</span>
                      <span>${totalCosts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Est. Profit</span>
                      <span className={estimatedProfit >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {estimatedProfit >= 0 ? '+' : ''}${estimatedProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">ROI</span>
                      <span className={roi >= 0 ? 'text-green-400' : 'text-red-400'}>{roi.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Margin</span>
                      <span className={profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}>{profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-sm space-y-3">
              <h4 className="font-semibold">Quick Stats</h4>
              <div className="flex justify-between"><span className="text-gray-400">Price/Mile</span><span>${listing.mileage > 0 ? (listing.price / listing.mileage).toFixed(2) : 'â'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Source</span><span className="capitalize">{listing.source}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Days Listed</span><span>{Math.max(1, Math.floor((Date.now() - new Date(listing.posted_at).getTime()) / 86400000))}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
