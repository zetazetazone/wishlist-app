import { supabase } from '../lib/supabase';
import { AuthUser } from '../types';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  birthday?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password, fullName, birthday }: SignUpData) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          birthday,
        },
      },
    });

    if (error) throw error;

    // Note: User profile is automatically created in public.users table
    // by the database trigger (handle_new_user function)
    // No need to manually insert here

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Get the current user session
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<{ data: AuthUser | null; error: any }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (!user) return { data: null, error: null };

    return {
      data: {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}
