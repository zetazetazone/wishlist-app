import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Center,
  Spinner,
  Box,
  Divider,
} from '@gluestack-ui/themed';
import { supabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/storage';
import { Database } from '@/types/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setIsLoading(false);
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  const avatarUrl = profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null;

  const formatBirthday = (birthday: string | null) => {
    if (!birthday) return 'Not specified';
    try {
      return format(new Date(birthday), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatMemberSince = (createdAt: string | null) => {
    if (!createdAt) return 'Unknown';
    try {
      return format(new Date(createdAt), 'MMMM yyyy');
    } catch (error) {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
          }}
        />
        <Center flex={1}>
          <Spinner size="large" />
        </Center>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
          }}
        />
        <Center flex={1} padding="$6">
          <Text fontSize="$lg" color="$textLight600">
            Profile not found
          </Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.display_name || 'Profile',
          headerShown: true,
        }}
      />

      <ScrollView>
        <VStack flex={1} space="lg" padding="$6">
          {/* Avatar and Name */}
          <Center>
            <Avatar size="2xl" borderRadius="$full" marginBottom="$4">
              {avatarUrl ? (
                <AvatarImage source={{ uri: avatarUrl }} alt={profile.display_name || 'Profile'} />
              ) : (
                <AvatarFallbackText>
                  {profile.display_name || profile.email || 'User'}
                </AvatarFallbackText>
              )}
            </Avatar>
            <Heading size="xl">{profile.display_name || 'Unknown User'}</Heading>
          </Center>

          <Divider marginVertical="$2" />

          {/* Profile Details */}
          <VStack space="md">
            {/* Birthday */}
            <Box>
              <Text fontSize="$sm" color="$textLight500" marginBottom="$1">
                Birthday
              </Text>
              <Text fontSize="$lg" fontWeight="$medium">
                {formatBirthday(profile.birthday)}
              </Text>
            </Box>

            {/* Member Since */}
            <Box>
              <Text fontSize="$sm" color="$textLight500" marginBottom="$1">
                Member Since
              </Text>
              <Text fontSize="$lg" fontWeight="$medium">
                {formatMemberSince(profile.created_at)}
              </Text>
            </Box>

            {/* Email (optional - only show for current user or in certain contexts) */}
            {profile.email && (
              <Box>
                <Text fontSize="$sm" color="$textLight500" marginBottom="$1">
                  Email
                </Text>
                <Text fontSize="$lg" fontWeight="$medium">
                  {profile.email}
                </Text>
              </Box>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </>
  );
}
