/**
 * Shared URL Screen
 * Handles incoming share intents with URL scraping and quick-add flow
 * Part of Phase 39: Share Intent (SHARE-01 through SHARE-08)
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scrapeUrl } from '../../lib/urlScraper';
import { quickAddToDefaultWishlist } from '../../lib/shareIntent';
import { supabase } from '../../lib/supabase';
import { WishlistPickerSheet } from '../../components/wishlist/WishlistPickerSheet';
import { useDefaultWishlist, useWishlists } from '../../hooks/useWishlists';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import type { ScrapedMetadata } from '../../types/scraping.types';

export default function SharedUrlScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<ScrapedMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | null>(null);
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);
  const { data: defaultWishlist } = useDefaultWishlist();
  const { data: wishlists = [] } = useWishlists();

  // Set default wishlist on load
  useEffect(() => {
    if (defaultWishlist?.id && !selectedWishlistId) {
      setSelectedWishlistId(defaultWishlist.id);
    }
  }, [defaultWishlist?.id, selectedWishlistId]);

  // Auto-scrape on mount
  useEffect(() => {
    if (url) {
      handleScrape(url);
    } else {
      setIsLoading(false);
      setError(t('sharedUrl.noUrl'));
    }
  }, [url]);

  async function handleScrape(targetUrl: string) {
    setIsLoading(true);
    setError(null);

    const result = await scrapeUrl(targetUrl);

    if (result.success && result.data) {
      setMetadata(result.data);
    } else {
      setError(result.error || t('sharedUrl.scrapeFailed'));
      // Set partial metadata for display (shows source URL even on failure)
      setMetadata({
        title: null,
        description: null,
        imageUrl: null,
        price: null,
        currency: null,
        siteName: null,
        sourceUrl: targetUrl,
      });
    }

    setIsLoading(false);
  }

  async function handleQuickAdd() {
    if (!metadata) return;

    // Use selected wishlist or fall back to default
    const targetWishlistId = selectedWishlistId || defaultWishlist?.id;
    if (!targetWishlistId) {
      setError(t('addFromUrl.noDefaultWishlist'));
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t('wishlist.mustBeLoggedIn'));
        setIsSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from('wishlist_items').insert({
        user_id: user.id,
        wishlist_id: targetWishlistId,
        group_id: null,
        name: metadata.title || 'Untitled',
        description: metadata.description || null,
        price: metadata.price || null,
        image_url: metadata.imageUrl || null,
        source_url: metadata.sourceUrl || null,
        priority: 0,
        status: 'active',
        item_type: 'standard',
      });

      setIsSaving(false);

      if (!insertError) {
        // Show success alert and navigate to main app
        Alert.alert(
          t('alerts.titles.success'),
          t('sharedUrl.saved'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.replace('/(app)/(tabs)'),
            },
          ]
        );
      } else {
        setError(t('sharedUrl.saveFailed'));
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setError(t('sharedUrl.saveFailed'));
      setIsSaving(false);
    }
  }

  function handleEdit() {
    // Navigate to full add-from-url with prefilled URL
    router.push({
      pathname: '/(app)/add-from-url',
      params: { prefillUrl: url }
    });
  }

  function handleCancel() {
    // Navigate back to main app
    router.replace('/(app)/(tabs)');
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: colors.white,
              marginBottom: spacing.sm,
            }}
          >
            {t('sharedUrl.title')}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.gold[200],
              fontWeight: '400',
            }}
          >
            {t('sharedUrl.loadingSubtitle')}
          </Text>
        </LinearGradient>

        {/* Loading indicator */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: spacing.xxl,
          }}
        >
          <ActivityIndicator size="large" color={colors.burgundy[600]} />
          <Text
            style={{
              marginTop: spacing.md,
              fontSize: 16,
              color: colors.burgundy[600],
            }}
          >
            {t('sharedUrl.loading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cream[50] }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.burgundy[800], colors.burgundy[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 60,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: colors.white,
            marginBottom: spacing.sm,
          }}
        >
          {t('sharedUrl.title')}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.gold[200],
            fontWeight: '400',
          }}
        >
          {error ? t('sharedUrl.errorSubtitle') : t('sharedUrl.subtitle')}
        </Text>
      </LinearGradient>

      {/* Error Banner */}
      {error && (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.lg,
            backgroundColor: colors.gold[50],
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.gold[200],
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={24}
            color={colors.gold[600]}
          />
          <Text
            style={{
              fontSize: 14,
              color: colors.gold[700],
              marginLeft: spacing.sm,
              flex: 1,
            }}
          >
            {t('sharedUrl.scrapeFailedHint')}
          </Text>
        </View>
      )}

      {/* Preview Card */}
      {metadata && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              ...shadows.md,
            }}
          >
            {/* Image Preview */}
            {metadata.imageUrl ? (
              <View style={{ marginBottom: spacing.md }}>
                <Image
                  source={{ uri: metadata.imageUrl }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.cream[100],
                  }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.cream[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.md,
                }}
              >
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={48}
                  color={colors.burgundy[300]}
                />
                <Text style={{ color: colors.burgundy[400], marginTop: spacing.sm }}>
                  {t('sharedUrl.noImage')}
                </Text>
              </View>
            )}

            {/* Title */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.sm,
              }}
              numberOfLines={3}
            >
              {metadata.title || t('sharedUrl.untitled')}
            </Text>

            {/* Price */}
            {metadata.price != null && (
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: colors.gold[600],
                  marginBottom: spacing.sm,
                }}
              >
                {metadata.currency || '$'}{metadata.price.toFixed(2)}
              </Text>
            )}

            {/* Description */}
            {metadata.description && (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.burgundy[600],
                  marginBottom: spacing.md,
                  lineHeight: 20,
                }}
                numberOfLines={4}
              >
                {metadata.description}
              </Text>
            )}

            {/* Source URL */}
            <View
              style={{
                backgroundColor: colors.cream[100],
                borderRadius: borderRadius.md,
                padding: spacing.md,
                marginTop: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.burgundy[500],
                  marginBottom: spacing.xs,
                }}
              >
                {t('sharedUrl.from')}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.burgundy[600],
                }}
                numberOfLines={2}
                ellipsizeMode="middle"
              >
                {metadata.sourceUrl}
              </Text>
            </View>

            {/* Site Name (if available) */}
            {metadata.siteName && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: spacing.md,
                }}
              >
                <MaterialCommunityIcons
                  name="store"
                  size={16}
                  color={colors.burgundy[400]}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.burgundy[500],
                    marginLeft: spacing.xs,
                  }}
                >
                  {metadata.siteName}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Wishlist Selector */}
      {metadata && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.burgundy[700],
              marginBottom: spacing.xs,
            }}
          >
            {t('addFromUrl.addToWishlist')}
          </Text>
          <TouchableOpacity
            onPress={() => setShowWishlistPicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.white,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.gold[100],
            }}
          >
            <MaterialCommunityIcons
              name="clipboard-list"
              size={20}
              color={colors.burgundy[600]}
            />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.sm,
                fontSize: 16,
                color: colors.burgundy[700],
              }}
            >
              {selectedWishlistId
                ? wishlists.find((w) => w.id === selectedWishlistId)?.name ||
                  t('addFromUrl.defaultWishlist')
                : t('addFromUrl.defaultWishlist')}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.burgundy[400]}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        {/* Quick Add Button (SHARE-06) */}
        <TouchableOpacity
          onPress={handleQuickAdd}
          disabled={isSaving || !metadata}
          activeOpacity={0.7}
          style={{
            backgroundColor: isSaving ? colors.gold[300] : colors.gold[500],
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: spacing.md,
            ...shadows.gold,
          }}
        >
          {isSaving ? (
            <>
              <ActivityIndicator color={colors.white} size="small" />
              <Text
                style={{
                  color: colors.white,
                  fontSize: 18,
                  fontWeight: '700',
                  marginLeft: spacing.sm,
                }}
              >
                {t('sharedUrl.saving')}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="heart-plus" size={24} color={colors.white} />
              <Text
                style={{
                  color: colors.white,
                  fontSize: 18,
                  fontWeight: '700',
                  marginLeft: spacing.sm,
                }}
              >
                {t('sharedUrl.addToWishlist')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Edit Details Button */}
        <TouchableOpacity
          onPress={handleEdit}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.burgundy[600],
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
          <Text
            style={{
              color: colors.white,
              fontSize: 16,
              fontWeight: '600',
              marginLeft: spacing.sm,
            }}
          >
            {t('sharedUrl.editDetails')}
          </Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          onPress={handleCancel}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.cream[200],
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: colors.burgundy[700],
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            {t('sharedUrl.cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      <WishlistPickerSheet
        visible={showWishlistPicker}
        onClose={() => setShowWishlistPicker(false)}
        onSelect={(wishlistId) => {
          setSelectedWishlistId(wishlistId);
          setShowWishlistPicker(false);
        }}
        selectedWishlistId={selectedWishlistId || undefined}
      />
    </ScrollView>
  );
}
