/**
 * Member Profile Screen
 *
 * Read-only view of another member's profile and personal details.
 * Accessible from group member lists and celebration screens.
 *
 * PROF-07: Group members can view another member's personal details
 * PROF-09: Last updated timestamp displays on member profile
 */

import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import {
  VStack,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
} from '@gluestack-ui/themed';
import { supabase } from '@/lib/supabase';
import { getPersonalDetails, TypedPersonalDetails } from '@/lib/personalDetails';
import { getAvatarUrl } from '@/lib/storage';
import { CompletenessIndicator } from '@/components/profile/CompletenessIndicator';
import { PersonalDetailsReadOnly } from '@/components/profile/PersonalDetailsReadOnly';
import { calculateCompleteness, CompletenessResult } from '@/lib/profileCompleteness';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface MemberProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [personalDetails, setPersonalDetails] = useState<TypedPersonalDetails | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);

  useEffect(() => {
    if (id) {
      loadMemberData();
    }
  }, [id]);

  const loadMemberData = async () => {
    try {
      setIsLoading(true);

      // Fetch member's user_profile for name/avatar
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', id)
        .single();

      if (profileError) {
        console.error('Error loading member profile:', profileError);
        return;
      }

      setMemberProfile(profile);

      // Fetch member's personal_details
      const details = await getPersonalDetails(id);
      setPersonalDetails(details);

      // Calculate completeness if details exist
      if (details) {
        const result = calculateCompleteness(
          details.sizes,
          details.preferences,
          details.external_links
        );
        setCompleteness(result);
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const avatarUrl = memberProfile?.avatar_url
    ? getAvatarUrl(memberProfile.avatar_url)
    : null;

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerStyle: { backgroundColor: '#ffffff' },
            headerTintColor: colors.burgundy[700],
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.burgundy[600]} />
        </View>
      </>
    );
  }

  if (!memberProfile) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerStyle: { backgroundColor: '#ffffff' },
            headerTintColor: colors.burgundy[700],
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Member not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: memberProfile.display_name || 'Profile',
          headerShown: true,
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: colors.burgundy[700],
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Member Header */}
        <View style={styles.headerCard}>
          <Avatar size="xl" borderRadius="$full">
            {avatarUrl ? (
              <AvatarImage source={{ uri: avatarUrl }} alt={memberProfile.display_name || 'Member'} />
            ) : (
              <AvatarFallbackText>
                {memberProfile.display_name || 'Member'}
              </AvatarFallbackText>
            )}
          </Avatar>
          <Text style={styles.displayName}>
            {memberProfile.display_name || 'Member'}
          </Text>
        </View>

        {/* Personal Details */}
        {personalDetails ? (
          <VStack space="md">
            {/* Completeness Indicator */}
            {completeness && <CompletenessIndicator result={completeness} />}

            {/* Read-only Personal Details */}
            <PersonalDetailsReadOnly
              sizes={personalDetails.sizes}
              preferences={personalDetails.preferences}
              externalLinks={personalDetails.external_links}
              updatedAt={personalDetails.updated_at}
            />
          </VStack>
        ) : (
          <View style={styles.noDetailsCard}>
            <Text style={styles.noDetailsText}>
              This member hasn't added personal details yet
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream[100],
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream[100],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream[100],
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.cream[600],
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginTop: spacing.md,
  },
  noDetailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  noDetailsText: {
    fontSize: 15,
    color: colors.cream[600],
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
