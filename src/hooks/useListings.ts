import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Listing, UserActionsRecord } from '../types/index';
import { useAuth } from './useAuth';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'mileage_asc' | 'mileage_desc';

export interface ListingsFilters {
  minPrice?: number;
  maxPrice?: number;
  makes?: string[];
  location?: string;
  maxMileage?: number;
  dealScores?: string[];
  search?: string;
  sort?: SortOption;
}

export interface ListingWithStatus extends Listing {
  isLiked?: boolean;
  isSkipped?: boolean;
}

export function useListings(filters: ListingsFilters) {
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState(20);

  useEffect(() => {
    fetchListings();
  }, [filters, user, displayCount]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query with filters
      let query = supabase.from('listings').select('*', { count: 'exact' }).eq('is_active', true);

      if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
      if (filters.makes && filters.makes.length > 0) query = query.in('make', filters.makes);
      if (filters.location) query = query.ilike('location', `%${filters.location}%`);
      if (filters.maxMileage !== undefined) query = query.lte('mileage', filters.maxMileage);
      if (filters.dealScores && filters.dealScores.length > 0) query = query.in('deal_score', filters.dealScores);
      if (filters.search) query = query.or(`title.ilike.%${filters.search}%,make.ilike.%${filters.search}%,model.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

      // Get user actions to mark liked/skipped (but DON'T filter them out)
      let userLikedIds = new Set<string>();
      let userSkippedIds = new Set<string>();
      if (user) {
        const { data: actions } = await supabase
          .from('user_actions')
          .select('listing_id, action')
          .eq('user_id', user.id);
        if (actions) {
          for (const a of actions) {
            if (a.action === 'like') userLikedIds.add(a.listing_id);
            else if (a.action === 'skip') userSkippedIds.add(a.listing_id);
          }
        }
        setLikedIds(userLikedIds);
        setViewedIds(new Set([...userLikedIds, ...userSkippedIds]));
      }

      // Apply sort
      const sort = filters.sort || 'newest';
      switch (sort) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'mileage_asc': query = query.order('mileage', { ascending: true }); break;
        case 'mileage_desc': query = query.order('mileage', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }
      query = query.limit(displayCount);
      const { data, error: queryError, count } = await query;
      if (queryError) throw queryError;

      // Annotate listings with liked/skipped status
      const annotated: ListingWithStatus[] = (data || []).map((l: Listing) => ({
        ...l,
        isLiked: userLikedIds.has(l.id),
        isSkipped: userSkippedIds.has(l.id),
      }));

      setListings(annotated);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (listingId: string) => {
    if (!user) return;
    try {
      // Check if already liked
      if (likedIds.has(listingId)) return;

      await supabase.from('user_actions').insert({
        user_id: user.id,
        listing_id: listingId,
        action: 'like',
      });

      // Update local state immediately
      setLikedIds(prev => new Set(prev).add(listingId));
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, isLiked: true } : l));

      // Learn preferences from liked listing
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
          if (likedListing.make && !makes.includes(likedListing.make)) makes.push(likedListing.make);
          if (likedListing.location && !locations.includes(likedListing.location)) locations.push(likedListing.location);
          await supabase
            .from('user_preferences')
            .update({ preferred_makes: makes, preferred_locations: locations })
            .eq('user_id', user.id);
        }
      }
    } catch (err) {
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
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, isSkipped: true } : l));
    } catch (err) {
      console.error('Error skipping listing:', err);
    }
  };


  const handleContact = async (listingId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('user_actions')
        .insert({
          user_id: user.id,
          listing_id: listingId,
          action: 'contact',
        });
    } catch (err) {
      console.error('Error logging contact:', err);
    }
  };

  const loadMore = () => setDisplayCount(prev => prev + 20);
  const hasMore = listings.length >= displayCount && listings.length < totalCount;

  return {
    listings,
    loading,
    error,
    totalCount,
    viewedCount: viewedIds.size,
    handleLike,
    handleSkip,
    refetch: fetchListings,
    handleContact,
    loadMore,
    hasMore,
  };
}

export function useSavedListings() {
  const { user } = useAuth();
  const [savedListings, setSavedListings] = useState<ListingWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSavedListings([]);
      setLoading(false);
      return;
    }
    fetchSavedListings();
  }, [user]);

  const fetchSavedListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: actions } = await supabase
        .from('user_actions')
        .select('listing_id')
        .eq('user_id', user?.id)
        .eq('action', 'like');

      if (!actions || actions.length === 0) {
        setSavedListings([]);
        return;
      }

      const listingIds = actions.map(a => a.listing_id);
      const { data: listings, error: queryError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)
        .eq('is_active', true);

      if (queryError) throw queryError;

      const annotated: ListingWithStatus[] = (listings || []).map(l => ({
        ...l,
        isLiked: true,
      }));

      setSavedListings(annotated);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch saved listings');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (listingId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('user_actions')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .eq('action', 'like');

      setSavedListings(prev => prev.filter(l => l.id !== listingId));
    } catch (err) {
      console.error('Error unliking listing:', err);
    }
  };

  return {
    savedListings,
    loading,
    error,
    handleUnlike,
    refetch: fetchSavedListings,
  };
}
