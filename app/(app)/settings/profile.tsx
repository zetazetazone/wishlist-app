import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocalizedFormat } from '@/hooks/useLocalizedFormat';
import {
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
  Heading,
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Pressable,
  Box,
} from '@gluestack-ui/themed';
import { supabase } from '@/lib/supabase';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';
import { getPersonalDetails } from '@/lib/personalDetails';
import { calculateCompleteness, CompletenessResult } from '@/lib/profileCompleteness';

interface UserProfile {
  id: string;
  display_name: string | null;
  birthday: string | null;
  avatar_url: string | null;
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { format } = useLocalizedFormat();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { currentLanguage } = useLanguage(userId);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        Alert.alert(t('alerts.titles.error'), t('profile.failedToLoad'));
        return;
      }

      setProfile(data);
      setDisplayName(data.display_name || '');
      setAvatarPath(data.avatar_url);
      setUserId(user.id); // Store userId for useLanguage hook

      // Load personal details for completeness indicator
      const details = await getPersonalDetails(user.id);
      if (details) {
        setCompleteness(calculateCompleteness(details.sizes, details.preferences, details.external_links));
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
      Alert.alert(t('alerts.titles.error'), t('common.errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const path = await uploadAvatar(user.id);
      if (path) {
        setAvatarPath(path);
        setAvatarTimestamp(Date.now()); // Force refresh avatar display
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert(t('alerts.titles.error'), t('profile.failedToUploadPhoto'));
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert(t('onboarding.requiredField'), t('onboarding.enterDisplayName'));
      return;
    }

    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.titles.error'), t('onboarding.couldNotGetUser'));
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarPath,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert(t('alerts.titles.error'), t('profile.failedToSave'));
        return;
      }

      Alert.alert(t('common.success'), t('profile.updatedSuccessfully'), [
        { text: t('common.ok'), onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert(t('alerts.titles.error'), t('common.errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  const getAvatarUrlWithCache = () => {
    const url = getAvatarUrl(avatarPath);
    if (url) {
      return `${url}?t=${avatarTimestamp}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <VStack flex={1} justifyContent="center" alignItems="center">
        <Text>{t('common.loading')}</Text>
      </VStack>
    );
  }

  const avatarUrl = getAvatarUrlWithCache();

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <VStack flex={1} padding="$6" space="xl">
        <Heading size="lg" textAlign="center">
          {t('profile.editProfile')}
        </Heading>

        {/* Avatar Upload */}
        <VStack space="md" alignItems="center" marginTop="$4">
          <Pressable onPress={handleAvatarUpload}>
            <Avatar size="2xl" borderRadius="$full">
              {avatarUrl ? (
                <AvatarImage source={{ uri: avatarUrl }} alt="Profile" />
              ) : (
                <AvatarFallbackText>{displayName || t('profile.user')}</AvatarFallbackText>
              )}
            </Avatar>
          </Pressable>
          <Button variant="link" onPress={handleAvatarUpload}>
            <ButtonText>
              {avatarPath ? t('profile.changePhoto') : t('profile.addPhoto')}
            </ButtonText>
          </Button>
        </VStack>

        {/* Display Name Input */}
        <VStack space="xs">
          <Text fontWeight="$medium" color="$textLight700">
            {t('profile.displayName')}
          </Text>
          <Input variant="outline" size="lg">
            <InputField
              placeholder={t('onboarding.enterYourName')}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </Input>
        </VStack>

        {/* Locked Birthday Field */}
        <VStack space="xs">
          <HStack alignItems="center" space="xs">
            <Text fontWeight="$medium" color="$textLight700">
              {t('profile.birthday')}
            </Text>
            <MaterialCommunityIcons name="lock" size={14} color="#9CA3AF" />
          </HStack>
          <Box
            backgroundColor="$backgroundLight100"
            borderRadius="$md"
            padding="$3"
            borderWidth={1}
            borderColor="$borderLight200"
          >
            <Text color="$textLight600">
              {profile?.birthday
                ? format(new Date(profile.birthday), 'MMMM d, yyyy')
                : t('profile.notSet')}
            </Text>
          </Box>
          <Text fontSize="$xs" color="$textLight500">
            {t('profile.birthdayLocked')}
          </Text>
        </VStack>

        {/* Personal Details Link */}
        <Pressable
          onPress={() => router.push('/settings/personal-details')}
        >
          <Box
            backgroundColor="$white"
            borderRadius="$lg"
            padding="$4"
            borderWidth={1}
            borderColor="$borderLight200"
          >
            <HStack justifyContent="space-between" alignItems="center">
              <VStack>
                <Text fontWeight="$semibold">{t('profile.personalDetails.title')}</Text>
                <Text fontSize="$xs" color="$textLight500">
                  {t('profile.personalDetails.subtitle')}
                </Text>
              </VStack>
              <HStack alignItems="center" space="sm">
                {/* Show mini completeness badge */}
                <Text fontSize="$sm" color="$textLight500">
                  {completeness?.percentage ?? 0}%
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </HStack>
            </HStack>
          </Box>
        </Pressable>

        {/* Important Dates Link */}
        <Pressable
          onPress={() => router.push('/settings/public-dates')}
        >
          <Box
            backgroundColor="$white"
            borderRadius="$lg"
            padding="$4"
            borderWidth={1}
            borderColor="$borderLight200"
          >
            <HStack justifyContent="space-between" alignItems="center">
              <VStack>
                <Text fontWeight="$semibold">{t('calendar.publicDates.title')}</Text>
                <Text fontSize="$xs" color="$textLight500">
                  {t('calendar.publicDates.subtitle')}
                </Text>
              </VStack>
              <HStack alignItems="center" space="sm">
                <MaterialCommunityIcons name="calendar-heart" size={20} color="#8B1538" />
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </HStack>
            </HStack>
          </Box>
        </Pressable>

        {/* Language Settings Link */}
        <Pressable
          onPress={() => router.push('/settings/language')}
        >
          <Box
            backgroundColor="$white"
            borderRadius="$lg"
            padding="$4"
            borderWidth={1}
            borderColor="$borderLight200"
          >
            <HStack justifyContent="space-between" alignItems="center">
              <VStack>
                <Text fontWeight="$semibold">{t('settings.language')}</Text>
                <Text fontSize="$xs" color="$textLight500">
                  {t(`languages.${currentLanguage}`)}
                </Text>
              </VStack>
              <HStack alignItems="center" space="sm">
                <MaterialCommunityIcons name="translate" size={20} color="#8B1538" />
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </HStack>
            </HStack>
          </Box>
        </Pressable>

        {/* Save Button */}
        <Button
          size="lg"
          marginTop="$4"
          onPress={handleSave}
          isDisabled={isSaving || !displayName.trim()}
        >
          <ButtonText>{isSaving ? t('common.saving') : t('profile.saveChanges')}</ButtonText>
        </Button>
      </VStack>
    </ScrollView>
  );
}
