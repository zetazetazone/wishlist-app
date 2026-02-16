import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { scrapeUrl } from '../../lib/urlScraper';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

export default function AddFromUrlScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // URL and loading state
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Editable fields (populated from scrape or manual)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [siteName, setSiteName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  // Track if we've scraped/shown preview
  const [showPreview, setShowPreview] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      Alert.alert(t('alerts.titles.error'), t('addFromUrl.urlRequired'));
      return;
    }

    setIsLoading(true);
    setScrapeError(null);

    try {
      const result = await scrapeUrl(url.trim());

      // Always show the preview form after attempting to scrape
      setShowPreview(true);
      setSourceUrl(url.trim());

      if (result.success && result.data) {
        // Populate fields from scraped data
        setTitle(result.data.title || '');
        setDescription(result.data.description || '');
        setImageUrl(result.data.imageUrl || '');
        setPrice(result.data.price ? result.data.price.toString() : '');
        setSiteName(result.data.siteName || '');
        setSourceUrl(result.data.sourceUrl);
        setShowManualEntry(false);
        setScrapeError(null);
      } else {
        // Scrape failed - show form for manual entry with error message
        setScrapeError(result.error || t('addFromUrl.scrapeFailed'));
        setShowManualEntry(true);
        // Keep any partial data that might exist
        if (result.data) {
          setTitle(result.data.title || '');
          setDescription(result.data.description || '');
          setImageUrl(result.data.imageUrl || '');
          setPrice(result.data.price ? result.data.price.toString() : '');
          setSiteName(result.data.siteName || '');
        }
      }
    } catch (error) {
      console.error('Error during scrape:', error);
      setScrapeError(t('common.errors.generic'));
      setShowPreview(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterManually = () => {
    setShowManualEntry(true);
    setShowPreview(true);
    setScrapeError(null);
    // Clear fields for manual entry
    setTitle('');
    setDescription('');
    setImageUrl('');
    setPrice('');
    setSiteName('');
    setSourceUrl(url.trim());
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('alerts.titles.error'), t('addFromUrl.titleRequired'));
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.titles.error'), t('wishlist.mustBeLoggedIn'));
        return;
      }

      // Get user's default wishlist
      const { data: defaultWishlist, error: wishlistError } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (wishlistError || !defaultWishlist) {
        Alert.alert(t('alerts.titles.error'), t('addFromUrl.noDefaultWishlist'));
        return;
      }

      // Insert wishlist item
      const { error: insertError } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: user.id,
          wishlist_id: defaultWishlist.id,
          group_id: null, // Will be set when sharing (Phase 42)
          name: title.trim(),
          description: description.trim() || null,
          price: price ? parseFloat(price) : null,
          image_url: imageUrl || null,
          amazon_url: sourceUrl || null, // Legacy column, will be renamed in Phase 41
          priority: 0,
          status: 'active',
          item_type: 'standard',
        });

      if (insertError) {
        console.error('Error saving item:', insertError);
        Alert.alert(t('alerts.titles.error'), t('addFromUrl.saveFailed'));
        return;
      }

      Alert.alert(t('alerts.titles.success'), t('addFromUrl.saved'));
      router.back();
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert(t('alerts.titles.error'), t('common.errors.generic'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
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
              fontSize: 32,
              fontWeight: '700',
              color: colors.white,
              marginBottom: spacing.sm,
            }}
          >
            {t('addFromUrl.title')}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.gold[200],
              fontWeight: '400',
            }}
          >
            {t('addFromUrl.subtitle')}
          </Text>
        </LinearGradient>

        {/* URL Input Section */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              ...shadows.md,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.burgundy[700],
                marginBottom: spacing.sm,
              }}
            >
              {t('addFromUrl.productUrl')}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.cream[50],
                borderRadius: borderRadius.md,
                padding: spacing.md,
                fontSize: 16,
                color: colors.burgundy[800],
                marginBottom: spacing.md,
              }}
              placeholder={t('addFromUrl.urlPlaceholder')}
              placeholderTextColor={colors.burgundy[300]}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              onPress={handleScrape}
              disabled={isLoading}
              activeOpacity={0.7}
              style={{
                backgroundColor: isLoading ? colors.burgundy[300] : colors.burgundy[600],
                borderRadius: borderRadius.md,
                padding: spacing.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 16,
                      fontWeight: '600',
                      marginLeft: spacing.sm,
                    }}
                  >
                    {t('addFromUrl.scraping')}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="download" size={20} color={colors.white} />
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 16,
                      fontWeight: '600',
                      marginLeft: spacing.sm,
                    }}
                  >
                    {t('addFromUrl.scrapeButton')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error/Info Message - shows inline when scraping fails */}
        {scrapeError && showPreview && (
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
            <MaterialCommunityIcons name="information-outline" size={24} color={colors.gold[600]} />
            <Text
              style={{
                fontSize: 14,
                color: colors.gold[700],
                marginLeft: spacing.sm,
                flex: 1,
              }}
            >
              {t('addFromUrl.scrapeFailedHint')}
            </Text>
          </View>
        )}

        {/* Preview/Edit Section */}
        {showPreview && (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                ...shadows.md,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.burgundy[800],
                  marginBottom: spacing.md,
                }}
              >
                {showManualEntry ? t('addFromUrl.enterDetails') : t('addFromUrl.reviewDetails')}
              </Text>

              {/* Image Preview */}
              {imageUrl ? (
                <View style={{ marginBottom: spacing.md }}>
                  <Image
                    source={{ uri: imageUrl }}
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
                    {t('addFromUrl.noImage')}
                  </Text>
                </View>
              )}

              {/* Title Input */}
              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.burgundy[700],
                    marginBottom: spacing.xs,
                  }}
                >
                  {t('addFromUrl.itemTitle')} *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.cream[50],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    fontSize: 16,
                    color: colors.burgundy[800],
                  }}
                  placeholder={t('addFromUrl.itemTitlePlaceholder')}
                  placeholderTextColor={colors.burgundy[300]}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Price Input */}
              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.burgundy[700],
                    marginBottom: spacing.xs,
                  }}
                >
                  {t('addFromUrl.itemPrice')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.cream[50],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    fontSize: 16,
                    color: colors.burgundy[800],
                  }}
                  placeholder={t('addFromUrl.itemPricePlaceholder')}
                  placeholderTextColor={colors.burgundy[300]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Description Input */}
              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.burgundy[700],
                    marginBottom: spacing.xs,
                  }}
                >
                  {t('addFromUrl.itemDescription')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.cream[50],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    fontSize: 16,
                    color: colors.burgundy[800],
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                  placeholder={t('addFromUrl.itemDescriptionPlaceholder')}
                  placeholderTextColor={colors.burgundy[300]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Source URL (non-editable display) */}
              {sourceUrl && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.burgundy[700],
                      marginBottom: spacing.xs,
                    }}
                  >
                    {t('addFromUrl.sourceUrl')}
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.cream[100],
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                    }}
                  >
                    <Text
                      style={{ fontSize: 14, color: colors.burgundy[600] }}
                      numberOfLines={2}
                      ellipsizeMode="middle"
                    >
                      {sourceUrl}
                    </Text>
                  </View>
                </View>
              )}

              {/* Store/Site Name (non-editable display) */}
              {siteName && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.burgundy[700],
                      marginBottom: spacing.xs,
                    }}
                  >
                    {t('addFromUrl.store')}
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.cream[100],
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: colors.burgundy[600] }}>
                      {siteName}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {showPreview && (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.gold[500],
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                alignItems: 'center',
                marginBottom: spacing.md,
                ...shadows.gold,
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                {t('addFromUrl.saveButton')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
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
                {t('addFromUrl.cancelButton')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
