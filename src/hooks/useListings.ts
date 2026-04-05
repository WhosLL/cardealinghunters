import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Listing, UserActionsRecord } from '../types/index';
import { useAuth } from './useAuth';

export interface ListingsFilters {
  minPrice?: number;
  maxPrice?: number;
  makes?: string[];
  location?: string;
  maxMileage?: number;
  dealScores?: string[];
}

export function useListings(filters: ListingsFilters) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchListings();
  }, [filters, user]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.makes && filters.makes.length > 0) {
        query = query.in('make', filters.makes);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.maxMileage !== undefined) {
        query = query.lte('mileage', filters.maxMileage);
      }
      if (filters.dealScores && filters.dealScores.length > 0) {
        query = query.in('deal_score', filters.dealScores);
      }

      // Get user's already-viewed listings to exclude them
      let excludeIds: string[] = [];
      if (user) {
        const { data: actions } = await supabase
          .from('user_actions')
          .select('listing_id')
          .eq('user_id', user.id);

        if (actions && actions.length > 0) {
          excludeIds = actions.map((a: UserActionsRecord) => a.listing_id);
          setViewedIds(new Set(excludeIds));
        }
      }

      query = query.order('created_at', { ascending: false }).limit(50);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      let filtered = data || [];
      if (excludeIds.length > 0) {
        filtered = filtered.filter((l: Listing) => !excludeIds.includes(l.id));
      }

      setListings(filtered);
      setTotalCount(count || 0);
    } catch (err: any) {
      const message = err?.message || err?.details || 'Failed to fetch listings';
      setError(message);
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (listingId: string) => {
    if (!user) return;

    try {
      await supabase.from('user_actions').insert({
        user_id: user.id,
        listing_id: listingId,
        action: 'like',
      });

      // Update preferences based on liked listing
      const likedListing = listings.find(l => l.id === listingId);
      if (likedListing) {
        const { data: currentPrefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (currentPrefs) {
          const makes = currentPrefs.preferred_makes || [];
          const locations = currentPrefs.preferred_locations || [];
          if (likedListing.make && !makes.includes(likedListing.make)) {
            makes.push(likedListing.make);
          }
          if (likedListing.location && !locations.includes(likedListing.location)) {
            locations.push(likedListing.location);
          }
          await supabase
            .from('user_preferences')
            .update({
              preferred_makes: makes,
              preferred_locations: locations,
            })
            .eq('user_id', user.id);
        }
      }

      setViewedIds(prev => new Set(prev).add(listingId));
      setListings(prev => prev.filter(l => l.id !== listingId));
    } catch (err: any) {
      console.error('Error liking listing:', err);
    }
  };

  const handleSkip = async (listingId: string) => {
    if (!user) return;

    try {
      await supabase.from('user_actions').insert({
        user_id: user.id,
        listing_id: listingId,
        action: 'skip',
      });

      setViewedIds(prev => new Set(prev).add(listingId));
      setListings(prev => prev.filter(l => l.id !== listingId));
    } catch (err: any) {
      console.error('Error skipping listing:', err);
    }
  };

  return {
    listings,
    loading,
    error,
    totalCount,
    viewedCount: viewedIds.size,
    handleLike,
    handleSkip,
    refetch: fetchListings,
  };
}
