import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OnboardingStatus {
  isComplete: boolean;
  isLoading: boolean;
}

/**
 * Hook to check if the current user has completed onboarding
 * @returns Object with isComplete and isLoading status
 */
export function useOnboardingStatus(): OnboardingStatus {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        setIsLoading(true);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setIsComplete(false);
          setIsLoading(false);
          return;
        }

        // Check onboarding_completed field in user_profiles
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching onboarding status:', profileError);
          setIsComplete(false);
          setIsLoading(false);
          return;
        }

        setIsComplete(profile?.onboarding_completed ?? false);
      } catch (error) {
        console.error('Error in useOnboardingStatus:', error);
        setIsComplete(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboardingStatus();
  }, []);

  return { isComplete, isLoading };
}
