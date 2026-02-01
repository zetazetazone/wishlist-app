/**
 * Database Types
 * Auto-generated from Supabase schema
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  birthday?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  budget_limit_per_gift: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  group_id?: string; // Optional - allows personal wishlist items
  amazon_url: string;
  title: string;
  image_url?: string;
  price?: number;
  priority: number;
  status: 'active' | 'claimed' | 'purchased' | 'received' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Contribution {
  id: string;
  item_id: string;
  user_id: string;
  amount: number;
  status: 'pledged' | 'paid';
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  group_id: string;
  user_id: string;
  event_type: 'birthday' | 'custom';
  event_date: string;
  title: string;
  created_at: string;
}
