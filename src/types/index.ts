export type DealScore = 'great' | 'good' | 'fair' | 'overpriced';
export type UserAction = 'like' | 'skip';
export type ClientType = 'dealership' | 'wholesale' | 'individual';

export interface Listing {
  id: string;
  title: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  location: string;
  image_url: string;
  source_url: string;
  source: string;
  market_value: number | null;
  deal_score: DealScore;
  description: string;
  posted_at: string;
  created_at: string;
  is_active: boolean;
}

export interface UserActionsRecord {
  id: string;
  user_id: string;
  listing_id: string;
  action: UserAction;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_makes: string[];
  preferred_price_min: number | null;
  preferred_price_max: number | null;
  preferred_mileage_max: number | null;
  preferred_locations: string[];
  total_likes: number;
  total_skips: number;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  client_type: ClientType;
  market_location: string;
  created_at: string;
}

export interface ScrapeRun {
  id: string;
  apify_run_id: string;
  source: string;
  search_url: string;
  status: string;
  listings_added: number;
  started_at: string;
  completed_at: string | null;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, clientType: ClientType, marketLocation: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface ListingWithAction extends Listing {
  user_action?: UserActionsRecord | null;
}
