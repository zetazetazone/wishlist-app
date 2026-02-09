/**
 * Personal Details Edit Screen
 *
 * Form screen for users to edit their personal details:
 * - Clothing sizes (PROF-01)
 * - Favorite colors (PROF-02)
 * - Favorite brands and interests (PROF-03)
 * - Dislikes (PROF-04)
 * - External wishlist links (PROF-05)
 * - Delivery address (quick-004)
 * - Bank details (quick-004)
 *
 * Data is saved atomically with a single "Save" button.
 */

import { useState, useEffect, useMemo } from 'react';
import { Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  VStack,
  Heading,
  Button,
  ButtonText,
  Box,
} from '@gluestack-ui/themed';
import { supabase } from '@/lib/supabase';
import { getPersonalDetails, upsertPersonalDetails } from '@/lib/personalDetails';
import { calculateCompleteness } from '@/lib/profileCompleteness';
import type {
  PersonalSizes,
  PersonalPreferences,
  ExternalLink,
  DeliveryAddress,
  BankDetails,
  PersonalDetailsVisibility,
} from '@/types/database.types';
import { SizesSection } from '@/components/profile/SizesSection';
import { PreferencesSection } from '@/components/profile/PreferencesSection';
import { ExternalLinksSection } from '@/components/profile/ExternalLinksSection';
import { DeliveryAddressSection } from '@/components/profile/DeliveryAddressSection';
import { BankDetailsSection } from '@/components/profile/BankDetailsSection';
import { VisibilityToggle } from '@/components/profile/VisibilityToggle';
import { CompletenessIndicator } from '@/components/profile/CompletenessIndicator';
import { colors, spacing } from '@/constants/theme';

export default function PersonalDetailsScreen() {
  const router = useRouter();

  // Loading and saving states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form data
  const [sizes, setSizes] = useState<PersonalSizes>({});
  const [preferences, setPreferences] = useState<PersonalPreferences>({});
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({});
  const [bankDetails, setBankDetails] = useState<BankDetails>({});
  const [visibility, setVisibility] = useState<PersonalDetailsVisibility>({
    delivery_address: 'friends_only',
    bank_details: 'friends_only',
  });

  // Load existing data on mount
  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      const details = await getPersonalDetails(user.id);
      if (details) {
        setSizes(details.sizes || {});
        setPreferences(details.preferences || {});
        setExternalLinks(details.external_links || []);
        setDeliveryAddress(details.delivery_address || {});
        setBankDetails(details.bank_details || {});
        setVisibility(details.visibility || { delivery_address: 'friends_only', bank_details: 'friends_only' });
      }
    } catch (error) {
      console.error('Error loading personal details:', error);
      Alert.alert('Error', 'Failed to load personal details');
    } finally {
      setIsLoading(false);
    }
  };

  // Save all form data atomically
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertPersonalDetails({
        sizes,
        preferences,
        external_links: externalLinks,
        delivery_address: deliveryAddress,
        bank_details: bankDetails,
        visibility,
      });
      Alert.alert('Success', 'Personal details saved', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving personal details:', error);
      Alert.alert('Error', 'Failed to save personal details');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate completeness for indicator
  const completeness = useMemo(
    () => calculateCompleteness(sizes, preferences, externalLinks, deliveryAddress, bankDetails),
    [sizes, preferences, externalLinks, deliveryAddress, bankDetails]
  );

  // Loading state
  if (isLoading) {
    return (
      <VStack flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </VStack>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: spacing.lg,
        backgroundColor: colors.cream[100],
      }}
    >
      <VStack space="lg" flex={1}>
        {/* Header */}
        <Heading size="lg">Personal Details</Heading>

        {/* Completeness Indicator */}
        <CompletenessIndicator result={completeness} />

        {/* Sizes Section */}
        <SizesSection sizes={sizes} onChange={setSizes} />

        {/* Preferences Section */}
        <PreferencesSection preferences={preferences} onChange={setPreferences} />

        {/* External Links Section */}
        <ExternalLinksSection links={externalLinks} onChange={setExternalLinks} />

        {/* Delivery Address Section */}
        <VStack space="sm">
          <VisibilityToggle
            label="Delivery Address Visibility"
            value={visibility.delivery_address || 'friends_only'}
            onChange={(val) => setVisibility({ ...visibility, delivery_address: val })}
          />
          <DeliveryAddressSection
            address={deliveryAddress}
            onChange={setDeliveryAddress}
          />
        </VStack>

        {/* Bank Details Section */}
        <VStack space="sm">
          <VisibilityToggle
            label="Bank Details Visibility"
            value={visibility.bank_details || 'friends_only'}
            onChange={(val) => setVisibility({ ...visibility, bank_details: val })}
          />
          <BankDetailsSection
            bankDetails={bankDetails}
            onChange={setBankDetails}
          />
        </VStack>

        {/* Save Button */}
        <Box marginTop="$2" marginBottom="$6">
          <Button
            size="lg"
            onPress={handleSave}
            isDisabled={isSaving}
          >
            <ButtonText>{isSaving ? 'Saving...' : 'Save Changes'}</ButtonText>
          </Button>
        </Box>
      </VStack>
    </ScrollView>
  );
}
