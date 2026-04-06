import { useState } from 'react';
import { Heart, X, ExternalLink, MapPin, Gauge, TrendingDown, TrendingUp, Tag } from 'lucide-react';
import { ListingWithStatus } from '../hooks/useListings';

interface ListingCardProps {
  listing: ListingWithStatus;
  onLike: (id: string) => void;
  onSkip: (id: string) => void;
}

function getDealExplanation(price: number, marketValue: number, dealScore: string): { text: string; color: string } {
  if (!marketValue || marketValue <= 0) return { text: '', color: '' };

  const diff = Math.abs(price - marketValue);
  const diffFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(diff);
  const mvFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(marketValue);

  switch (dealScore) {
    case 'great':
      return {
        text: `Save ${diffFormatted} vs market avg of ${mvFormatted}`,
        color: 'text-emerald-400',
      };
    case 'good':
      return {
        text: `${diffFormatted} below market value of ${mvFormatted}`,
        color: 'text-yellow-400',
      };
    case 'fair':
      return {
        text: `Near market value of ${mvFormatted}`,
        color: 'text-gray-400',
      };
    case 'overpriced':
      return {
        text: `~${diffFormatted} above market avg of ${mvFormatted}`,
        color: 'text-red-400',
      };
    default:
      return { text: '', color: '' };
  }
}

function getDealBadgeStyles(dealScore: string): { bg: string; text: string; glow: string; icon: React.ReactNode } {
  switch (dealScore) {
    case 'great':
      return {
        bg: 'bg-emerald-900/30 border border-emerald-500/50',
        text: 'text-emerald-300 font-bold',
        glow: 'shadow-lg shadow-emerald-500/20',
        icon: <TrendingDown className="w-4 h-4" />,
      };
    case 'good':
      return {
        bg: 'bg-yellow-900/30 border border-yellow-500/50',
        text: 'text-yellow-300 font-bold',
        glow: 'shadow-lg shadow-yellow-500/20',
        icon: <TrendingDown className="w-4 h-4" />,
      };
    case 'fair':
      return {
        bg: 'bg-gray-800/30 border border-gray-500/50',
        text: 'text-gray-300 font-bold',
        glow: 'shadow-lg shadow-gray-500/20',
        icon: <Tag className="w-4 h-4" />,
      };
    case 'overpriced':
      return {
        bg: 'bg-red-900/30 border border-red-500/50',
        text: 'text-red-300 font-bold',
        glow: 'shadow-lg shadow-red-500/20',
        icon: <TrendingUp className="w-4 h-4" />,
      };
    default:
      return {
        bg: 'bg-gray-800/30 border border-gray-500/50',
        text: 'text-gray-300 font-bold',
        glow: '',
        icon: <Tag className="w-4 h-4" />,
      };
  }
}

export function ListingCard({ listing, onLike, onSkip }: ListingCardProps) {
  const [hovered, setHovered] = useState(false);
  const dealBadge = getDealBadgeStyles(listing.deal_score);
  const dealExplanation = getDealExplanation(listing.price, listing.market_value, listing.deal_score);

  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(listing.price);

  const mileageFormatted = new Intl.NumberFormat('en-US').format(listing.mileage);

  // Determine seller type from description
  const isDealer = listing.description?.toLowerCase().includes('dealer') ? true : false;
  const sellerType = isDealer ? 'Dealer' : 'Private';

  const isDarkMode = true; // Assuming dark theme

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 transform ${
        hovered ? 'scale-105 shadow-2xl' : 'shadow-lg'
      } ${listing.isSkipped ? 'opacity-50' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-950/90 backdrop-blur-xl border border-slate-700/30" />

      {/* Skipped overlay */}
      {listing.isSkipped && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 rounded-2xl">
          <div className="text-white text-xl font-bold">Skipped</div>
        </div>
      )}

      {/* Image container with overlay gradient */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={listing.image_url}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

        {/* Deal badge with glow */}
        <div className={`absolute top-3 left-3 ${dealBadge.bg} ${dealBadge.glow} rounded-full p-3 flex items-center gap-2`}>
          {dealBadge.icon}
          <span className={dealBadge.text}>{listing.deal_score}</span>
        </div>

        {/* Saved indicator */}
        {listing.isLiked && (
          <div className="absolute top-3 right-3 bg-red-500/80 rounded-full p-2 flex items-center gap-1">
            <Heart className="w-4 h-4 text-white fill-white" />
            <span className="text-white text-xs font-semibold">Saved</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 space-y-3">
        {/* Deal explanation */}
        {dealExplanation.text && (
          <p className={`text-xs ${dealExplanation.color} font-medium leading-tight`}>
            {dealExplanation.text}
          </p>
        )}

        {/* Title */}
        <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
          {listing.year} {listing.make} {listing.model}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">{priceFormatted}</p>
          {listing.market_value && listing.market_value > 0 && (
            <p className="text-xs text-gray-400">
              Market: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(listing.market_value)}
            </p>
          )}
        </div>

        {/* Mileage and location */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4" />
            <span>{mileageFormatted} mi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{listing.location}</span>
          </div>
        </div>

        {/* Description preview */}
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        {/* Seller type badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-700/50 text-gray-300 px-2.5 py-1 rounded-full font-medium">
            {sellerType}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2">
          {/* Like button */}
          <button
            onClick={() => onLike(listing.id)}
            disabled={listing.isLiked}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
              listing.isLiked
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 cursor-default'
                : 'bg-slate-700/50 border border-slate-600/50 text-gray-300 hover:bg-red-500/30 hover:border-red-500/50 hover:text-red-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${listing.isLiked ? 'fill-red-400' : ''}`} />
            <span className="text-sm">{listing.isLiked ? 'Saved' : 'Save'}</span>
          </button>

          {/* Skip button */}
          <button
            onClick={() => onSkip(listing.id)}
            disabled={listing.isSkipped}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
              listing.isSkipped
                ? 'bg-gray-600/20 border border-gray-500/50 text-gray-500 cursor-default'
                : 'bg-slate-700/50 border border-slate-600/50 text-gray-300 hover:bg-gray-600/30 hover:border-gray-500/50 hover:text-gray-400'
            }`}
          >
            <X className="w-4 h-4" />
            <span className="text-sm">{listing.isSkipped ? 'Skipped' : 'Skip'}</span>
          </button>

          {/* External link button */}
          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center py-2 px-3 rounded-lg font-medium transition-all duration-200 bg-slate-700/50 border border-slate-600/50 text-gray-300 hover:bg-blue-500/30 hover:border-blue-500/50 hover:text-blue-400"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
