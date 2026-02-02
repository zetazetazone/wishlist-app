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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          budget_limit_per_gift: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          budget_limit_per_gift?: number
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
          amazon_url: string
          title: string
          image_url: string | null
          price: number | null
          priority: number
          status: 'active' | 'claimed' | 'purchased' | 'received' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id?: string | null
          amazon_url: string
          title: string
          image_url?: string | null
          price?: number | null
          priority?: number
          status?: 'active' | 'claimed' | 'purchased' | 'received' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string | null
          amazon_url?: string
          title?: string
          image_url?: string | null
          price?: number | null
          priority?: number
          status?: 'active' | 'claimed' | 'purchased' | 'received' | 'archived'
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
    }
  }
}
