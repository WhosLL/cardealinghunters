import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Listing, UserActionsRecord } from '../types/index';
import { useAuth } from './useAuth';

export interface ListingsFilters {
  minPrice?: number;
  maxPrice?: number;
  make?: string;
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
      if (filters.make) {
        query = query.eq('make', filters.make);
      }
      if (filters.maxMileage !== undefined) {
        query = query.lte('mileage', filters.maxMileage);
      }
      if (filters.dealScores && filters.dealScores.length > 0) {
        query = query.in('deal_score', filters.dealScores);
      }

      query = query.order('posted_at', { ascending: false }).limit(50);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setTotalCount(count || 0);

      if (user) {
        // Get user's actions to filter out viewed listings
        const { data: userActions, error: actionsError } = await supabase
          .from('user_actions')
          .select('listing_id')
          .eq('user_id', user.id);

        if (!actionsError && userActions) {
          const viewed = new Set(userActions.map((action) => action.listing_id));
          setViewedIds(viewed);
          const filtered = (data || []).filter((listing) => !viewed.has(listing.id));
          setListings(filtered);
        } else {
          setListings(data || []);
        }
      } else {
        setListings(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (listingId: string) => {
    if (!user) return;

    try {
      // Insert or update action
      const { error } = await supabase.from('user_actions').upsert(
        {
          user_id: user.id,
          listing_id: listingId,
          action: 'like',
        },
        { onConflict: 'user_id,listing_id' }
      );

      if (error) throw error;

      // Update preferences
      const { data: listing } = await supabase
        .from('listings')
        .select('make, price, mileage, location')
        .eq('id', listingId)
        .single();

      if (listing) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (prefs) {
          const updatedMakes = Array.from(
            new Set([...(prefs.preferred_makes || []), listing.make])
          );
          const newLikes = (prefs.total_likes || 0) + 1;

          await supabase
            .from('user_preferences')
            .update({
              preferred_makes: updatedMakes,
              total_likes: newLikes,
            })
            .eq('user_id', user.id);
        }
      }

      // Remove from listings
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setViewedIds((prev) => new Set([...prev, listingId]));
    } catch (err) {
      console.error('Error liking listing:', err);
    }
  };

  const handleSkip = async (listingId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_actions').upsert(
        {
          user_id: user.id,
          listing_id: listingId,
          action: 'skip',
        },
        { onConflict: 'user_id,listing_id' }
      );

      if (error) throw error;

      // Update total skips
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('total_skips')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        await supabase
          .from('user_preferences')
          .update({
            total_skips: (prefs.total_skips || 0) + 1,
          })
          .eq('user_id', user.id);
      }

      // Remove from listings
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setViewedIds((prev) => new Set([...prev, listingId]));
    } catch (err) {
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

export function useSavedListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedListings();
  }, [user]);

  const fetchSavedListings = async () => {
    if (!user) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_actions')
        .select('listing_id, listings(*)')
        .eq('user_id', user.id)
        .eq('action', 'like');

      if (fetchError) throw fetchError;

      const extractedListings = (data || [])
        .map((item: any) => item.listings)
        .filter((listing) => listing && listing.is_active) as Listing[];

      setListings(extractedListings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch saved listings');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (listingId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_actions')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .eq('action', 'like');

      if (error) throw error;

      // Update total likes
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('total_likes')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        await supabase
          .from('user_preferences')
          .update({
            total_likes: Math.max(0, (prefs.total_likes || 1) - 1),
          })
          .eq('user_id', user.id);
      }

      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error('Error unliking listing:', err);
    }
  };

  return {
    listings,
    loading,
    error,
    refetch: fetchSavedListings,
    handleUnlike,
  };
}
