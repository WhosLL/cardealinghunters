import { useState } from 'react';
import { Heart, X, ExternalLink, MapPin, Gauge, BarChart3 } from 'lucide-react';
import { ListingWithStatus } from '../hooks/useListings';
import { getScoreColor, getScoreLabel } from '../lib/dealScore';
import { PriceComparisonChart } from './PriceComparisonChart';

interface ListingCardProps {
  listing: ListingWithStatus;
  onLike: (id: string) => void;
  onSkip: (id: string) => void;
  onContact?: (id: string) => void;
}

function getProxiedImageUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const isCraigslist =
      parsed.hostname === 'images.craigslist.org' ||
      parsed.hostname === 'ci.craigslist.org' ||
      parsed.hostname.endsWith('.craigslist.org');
    if (isCraigslist) {
      return '/api/image-proxy?url=' + encodeURIComponent(url);
    }
  } catch {}
  return url;
}

function getDealExplanation(price: number, marketValue: number): { text: string; color: string } {
  if (!marketValue || marketValue <= 0) return { text: '', color: '' };
  const diff = Math.abs(price - marketValue);
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const diffFormatted = fmt.format(diff);
  const mvFormatted = fmt.format(marketValue);

  if (price < marketValue * 0.92) return { text: 'Save ' + diffFormatted + ' vs market avg of ' + mvFormatted, color: 'text-emerald-400' };
  if (price < marketValue) return { text: diffFormatted + ' below market value of ' + mvFormatted, color: 'text-yellow-400' };
  if (price <= marketValue * 1.08) return { text: 'Near market value of ' + mvFormatted, color: 'text-gray-400' };
  return { text: '~' + diffFormatted + ' above market avg of ' + mvFormatted, color: 'text-red-400' };
}

export function ListingCard({ listing, onLike, onSkip, onContact }: ListingCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const score = listing.deal_score_numeric ?? 50;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const dealExplanation = getDealExplanation(listing.price, listing.market_value ?? 0);

  const priceFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.price);
  const mileageFormatted = listing.mileage > 0 ? new Intl.NumberFormat('en-US').format(listing.mileage) + ' mi' : 'N/A';
  const isDealer = listing.description?.toLowerCase().includes('dealer') ? true : false;
  const sellerType = isDealer ? 'Dealer' : 'Private';
  const imageSrc = getProxiedImageUrl(listing.image_url);

  // SVG ring parameters
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <>
      <div
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 transform ${
          hovered ? 'scale-105 shadow-2xl' : 'shadow-lg'
        } ${listing.isSkipped ? 'opacity-50' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-950/90 backdrop-blur-xl border border-slate-700/30" />

        {listing.isSkipped && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 rounded-2xl">
            <div className="text-white text-xl font-bold">Skipped</div>
          </div>
        )}

        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {!imgError && imageSrc ? (
            <img src={imageSrc} alt={listing.title} loading="lazy" onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">No image</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

          {/* Deal Score Ring Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full pl-1 pr-3 py-1 border border-slate-600/50">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="rgba(0,0,0,0.4)" stroke="#334155" strokeWidth="3" />
              <circle cx="22" cy="22" r={radius} fill="none" stroke={scoreColor} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={strokeDasharray} />
              <text x="22" y="22" textAnchor="middle" dominantBaseline="central" fill="white"
                fontSize="11" fontWeight="bold" transform="rotate(90 22 22)">{score}</text>
            </svg>
            <span className="text-xs font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
          </div>

          {listing.isLiked && (
            <div className="absolute top-3 right-3 bg-red-500/80 rounded-full p-2 flex items-center gap-1">
              <Heart className="w-4 h-4 text-white fill-white" />
              <span className="text-white text-xs font-semibold">Saved</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 p-4 space-y-3">
          {dealExplanation.text && (
            <p className={`text-xs ${dealExplanation.color} font-medium leading-tight`}>{dealExplanation.text}</p>
          )}

          <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
            {listing.year} {listing.make} {listing.model}
          </h3>

          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{priceFormatted}</p>
            {listing.market_value && listing.market_value > 0 && (
              <p className="text-xs text-gray-400">
                Market: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.market_value)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4" />
              <span>{mileageFormatted}</span>
            </div>
            {listing.location && listing.location !== 'Unknown' && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{listing.location}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{listing.description}</p>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-700/50 text-gray-300 px-2.5 py-1 rounded-full font-medium">{sellerType}</span>
            {/* Market Analysis button */}
            <button
              onClick={() => setShowChart(true)}
              className="text-xs bg-blue-900/30 border border-blue-500/30 text-blue-300 px-2.5 py-1 rounded-full font-medium hover:bg-blue-800/40 hover:border-blue-400/50 transition-colors flex items-center gap-1"
            >
              <BarChart3 className="w-3 h-3" />
              Market Analysis
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => onLike(listing.id)} disabled={listing.isLiked}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                listing.isLiked
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400 cursor-default'
                  : 'bg-slate-700/50 border border-slate-600/50 text-gray-300 hover:bg-red-500/30 hover:border-red-500/50 hover:text-red-400'
              }`}>
              <Heart className={`w-4 h-4 ${listing.isLiked ? 'fill-red-400' : ''}`} />
              <span className="text-sm">{listing.isLiked ? 'Saved' : 'Save'}</span>
            </button>
            <button onClick={() => onSkip(listing.id)} disabled={listing.isSkipped}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                listing.isSkipped
                  ? 'bg-gray-600/20 border border-gray-500/50 text-gray-500 cursor-default'
                  : 'bg-slate-700/50 border border-slate-600/50 text-gray-300 hover:bg-gray-600/30 hover:border-gray-500/50 hover:text-gray-400'
              }`}>
              <X className="w-4 h-4" />
              <span className="text-sm">{listing.isSkipped ? 'Skipped' : 'Skip'}</span>
            </button>
            {listing.source_url && (
              <button onClick={() => { window.open(listing.source_url, '_blank'); if (onContact) onContact(listing.id); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-medium">
                <ExternalLink className="w-4 h-4" />
                Contact Seller
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Price Comparison Chart Modal */}
      {showChart && (
        <PriceComparisonChart listingId={listing.id} onClose={() => setShowChart(false)} />
      )}
    </>
  );
}
