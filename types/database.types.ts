/**
 * Database Types
 * Supabase-compatible type definitions
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_url: string | null
          birthday: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          birthday?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          birthday?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          budget_limit_per_gift: number
          mode: 'greetings' | 'gifts'
          budget_approach: 'per_gift' | 'monthly' | 'yearly' | null
          budget_amount: number | null
          description: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          budget_limit_per_gift: number
          mode?: 'greetings' | 'gifts'
          budget_approach?: 'per_gift' | 'monthly' | 'yearly' | null
          budget_amount?: number | null
          description?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          budget_limit_per_gift?: number
          mode?: 'greetings' | 'gifts'
          budget_approach?: 'per_gift' | 'monthly' | 'yearly' | null
          budget_amount?: number | null
          description?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          group_id: string | null
          amazon_url: string | null
          title: string
          image_url: string | null
          price: number | null
          priority: number
          status: 'active' | 'claimed' | 'purchased' | 'received' | 'archived'
          item_type: 'standard' | 'surprise_me' | 'mystery_box'
          mystery_box_tier: 50 | 100 | null
          surprise_me_budget: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id?: string | null
          amazon_url?: string | null
          title: string
          image_url?: string | null
          price?: number | null
          priority?: number
          status?: 'active' | 'claimed' | 'purchased' | 'received' | 'archived'
          item_type?: 'standard' | 'surprise_me' | 'mystery_box'
          mystery_box_tier?: 50 | 100 | null
          surprise_me_budget?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string | null
          amazon_url?: string | null
          title?: string
          image_url?: string | null
          price?: number | null
          priority?: number
          status?: 'active' | 'claimed' | 'purchased' | 'received' | 'archived'
          item_type?: 'standard' | 'surprise_me' | 'mystery_box'
          mystery_box_tier?: 50 | 100 | null
          surprise_me_budget?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      contributions: {
        Row: {
          id: string
          item_id: string
          user_id: string
          amount: number
          status: 'pledged' | 'paid'
          is_secret: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          user_id: string
          amount: number
          status?: 'pledged' | 'paid'
          is_secret?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          user_id?: string
          amount?: number
          status?: 'pledged' | 'paid'
          is_secret?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          group_id: string
          user_id: string
          event_type: 'birthday' | 'custom'
          event_date: string
          title: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          event_type: 'birthday' | 'custom'
          event_date: string
          title: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          event_type?: 'birthday' | 'custom'
          event_date?: string
          title?: string
          created_at?: string
        }
      }
      device_tokens: {
        Row: {
          id: string
          user_id: string
          expo_push_token: string
          device_type: 'ios' | 'android' | 'web' | null
          last_active: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          expo_push_token: string
          device_type?: 'ios' | 'android' | 'web' | null
          last_active?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          expo_push_token?: string
          device_type?: 'ios' | 'android' | 'web' | null
          last_active?: string | null
          created_at?: string
        }
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          data: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body?: string | null
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string | null
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
      }
      celebrations: {
        Row: {
          id: string
          group_id: string
          celebrant_id: string
          event_date: string
          year: number
          gift_leader_id: string | null
          target_amount: number | null
          status: 'upcoming' | 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          celebrant_id: string
          event_date: string
          year: number
          gift_leader_id?: string | null
          target_amount?: number | null
          status?: 'upcoming' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          celebrant_id?: string
          event_date?: string
          year?: number
          gift_leader_id?: string | null
          target_amount?: number | null
          status?: 'upcoming' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      chat_rooms: {
        Row: {
          id: string
          celebration_id: string
          created_at: string
        }
        Insert: {
          id?: string
          celebration_id: string
          created_at?: string
        }
        Update: {
          id?: string
          celebration_id?: string
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_room_id: string
          sender_id: string
          content: string
          linked_item_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_room_id: string
          sender_id: string
          content: string
          linked_item_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_room_id?: string
          sender_id?: string
          content?: string
          linked_item_id?: string | null
          created_at?: string
        }
      }
      celebration_contributions: {
        Row: {
          id: string
          celebration_id: string
          user_id: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          celebration_id: string
          user_id: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          celebration_id?: string
          user_id?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      gift_leader_history: {
        Row: {
          id: string
          celebration_id: string
          assigned_to: string | null
          assigned_by: string | null
          reason: 'auto_rotation' | 'manual_reassign' | 'member_left'
          created_at: string
        }
        Insert: {
          id?: string
          celebration_id: string
          assigned_to?: string | null
          assigned_by?: string | null
          reason: 'auto_rotation' | 'manual_reassign' | 'member_left'
          created_at?: string
        }
        Update: {
          id?: string
          celebration_id?: string
          assigned_to?: string | null
          assigned_by?: string | null
          reason?: 'auto_rotation' | 'manual_reassign' | 'member_left'
          created_at?: string
        }
      }
      group_favorites: {
        Row: {
          id: string
          user_id: string
          group_id: string
          item_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          item_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          item_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Convenience type exports
export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Group = Database['public']['Tables']['groups']['Row'];
