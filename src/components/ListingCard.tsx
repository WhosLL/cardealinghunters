import { Heart, X, ExternalLink } from 'lucide-react';
import { Listing } from '../types/index';
import { DealBadge } from './DealBadge';

interface ListingCardProps {
  listing: Listing;
  onLike: (id: string) => void;
  onSkip: (id: string) => void;
  onUnlike?: (id: string) => void;
  showUnlike?: boolean;
}

export function ListingCard({
  listing,
  onLike,
  onSkip,
  onUnlike,
  showUnlike = false,
}: ListingCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(mileage));
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Image */}
      <div className="relative h-48 bg-gray-700 overflow-hidden">
        <img
          src={listing.image_url}
          alt={listing.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3">
          <DealBadge score={listing.deal_score} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-2">
          {listing.year} {listing.make} {listing.model}
        </h3>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-gray-300 mb-3 line-clamp-2">
            {listing.description}
          </p>
        )}

        {/* Price and Details */}
        <div className="mb-4 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-400">
              {formatPrice(listing.price)}
            </span>
            {listing.market_value && (
              <span className="text-xs text-gray-400">
                Market: {formatPrice(listing.market_value)}
              </span>
            )}
          </div>

          <div className="flex justify-between text-sm text-gray-400">
            <span>{formatMileage(listing.mileage)} miles</span>
            <span>{listing.location}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {showUnlike ? (
            <button
              onClick={() => onUnlike?.(listing.id)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Heart size={18} fill="currentColor" />
              Unlike
            </button>
          ) : (
            <button
              onClick={() => onLike(listing.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Heart size={18} />
              Like
            </button>
          )}

          <button
            onClick={() => onSkip(listing.id)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <X size={18} />
            Skip
          </button>

          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}
