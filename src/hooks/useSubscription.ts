import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'pro' | 'dealer';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | null;

export interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  customerId: string | null;
  loading: boolean;
  isProOrAbove: boolean;
  createCheckout: (priceId: string) => Promise<void>;
  manageSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
  const status = (profile?.subscription_status || null) as SubscriptionStatus;
  const customerId = profile?.stripe_customer_id || null;
  const isProOrAbove = tier === 'pro' || tier === 'dealer';

  const createCheckout = async (priceId: string) => {
    if (!user) {
      throw new Error('User must be logged in to create checkout');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  };

  const manageSubscription = async () => {
    if (!user) {
      throw new Error('User must be logged in to manage subscription');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          customerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to manage subscription');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    tier,
    status,
    customerId,
    loading,
    isProOrAbove,
    createCheckout,
    manageSubscription,
  };
}
