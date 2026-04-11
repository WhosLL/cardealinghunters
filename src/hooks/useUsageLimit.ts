import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { supabase } from '../lib/supabase';

const FREE_DAILY_LIMIT = 10;

export function useUsageLimit() {
  const { user } = useAuth();
  const { tier, isProOrAbove } = useSubscription();
  const [viewsToday, setViewsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isProOrAbove) {
      setLoading(false);
      return;
    }
    fetchUsageToday();
  }, [user, tier]);

  const fetchUsageToday = async () => {
    if (!user) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('user_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString());

      setViewsToday(count || 0);
    } catch (err) {
      console.error('Error fetching usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasReachedLimit = !isProOrAbove && viewsToday >= FREE_DAILY_LIMIT;
  const remaining = isProOrAbove ? Infinity : Math.max(0, FREE_DAILY_LIMIT - viewsToday);

  return {
    viewsToday,
    remaining,
    hasReachedLimit,
    limit: FREE_DAILY_LIMIT,
    isProOrAbove,
    loading,
    refresh: fetchUsageToday,
  };
}
