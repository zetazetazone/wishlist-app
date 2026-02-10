import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  checkContactPermission,
  requestContactPermission,
  expandContactAccess,
  matchContacts,
  MatchedUser,
} from '../../lib/contacts';
import { searchUsers, SearchResult } from '../../lib/discovery';
import { MatchedContactCard } from '../../components/discovery/MatchedContactCard';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

/**
 * Discover Screen - Find Friends
 *
 * Features:
 * - Contact permission handling with iOS 18 limited access support
 * - Device contact matching against registered users
 * - User search by name or email
 * - Debounced search (300ms)
 * - Pull-to-refresh for contact matches
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [permission, setPermission] = useState<'loading' | 'denied' | 'limited' | 'granted'>('loading');
  const [matchedContacts, setMatchedContacts] = useState<MatchedUser[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load - check permission and fetch matches
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const result = await checkContactPermission();

      if (!result.granted) {
        setPermission('denied');
        setLoading(false);
        return;
      }

      // Set permission based on access level
      setPermission(result.accessLevel === 'limited' ? 'limited' : 'granted');

      // Fetch matched contacts
      const matches = await matchContacts();
      setMatchedContacts(matches);
      setLoading(false);
    };

    initialize();
  }, []);

  // Debounced search
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query too short
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle permission request
  const handleRequestPermission = async () => {
    const result = await requestContactPermission();

    if (!result.granted) {
      setPermission('denied');
      return;
    }

    setPermission(result.accessLevel === 'limited' ? 'limited' : 'granted');

    // Fetch matched contacts
    setLoading(true);
    const matches = await matchContacts();
    setMatchedContacts(matches);
    setLoading(false);
  };

  // Handle expand contact access (iOS 18 limited)
  const handleExpandAccess = async () => {
    await expandContactAccess();

    // Re-check permission and refresh matches
    const result = await checkContactPermission();
    setPermission(result.accessLevel === 'limited' ? 'limited' : 'granted');

    const matches = await matchContacts();
    setMatchedContacts(matches);
  };

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const matches = await matchContacts();
    setMatchedContacts(matches);
    setRefreshing(false);
  }, []);

  // Status change handler (passed to cards)
  const handleStatusChange = useCallback(async () => {
    // Refresh matched contacts
    const matches = await matchContacts();
    setMatchedContacts(matches);

    // Re-run search if active
    if (searchQuery.length >= 2) {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    }
  }, [searchQuery]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Get subtitle text based on state
  const getSubtitle = () => {
    if (searchQuery.length >= 2) {
      return `${searchResults.length} results`;
    }
    if (matchedContacts.length > 0) {
      return `${matchedContacts.length} matches found`;
    }
    return 'Search or import contacts';
  };

  // Render permission denied state
  const renderPermissionDenied = () => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: 200 }}
    >
      <View style={styles.permissionCard}>
        <View style={styles.permissionIconContainer}>
          <MaterialCommunityIcons
            name="contacts-outline"
            size={60}
            color={colors.burgundy[400]}
          />
        </View>

        <Text style={styles.permissionTitle}>Import Your Contacts</Text>

        <Text style={styles.permissionSubtitle}>
          Find friends who already use Wishlist by importing your contacts
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRequestPermission}
        >
          <MaterialCommunityIcons
            name="account-multiple-plus"
            size={20}
            color={colors.white}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={styles.primaryButtonText}>Allow Access</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.linkButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    </MotiView>
  );

  // Render limited access banner (iOS 18)
  const renderLimitedBanner = () => (
    <TouchableOpacity
      style={styles.limitedBanner}
      onPress={handleExpandAccess}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name="alert-circle"
        size={20}
        color={colors.gold[800]}
        style={{ marginRight: spacing.sm }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.limitedBannerTitle}>Limited Access</Text>
        <Text style={styles.limitedBannerText}>
          You've granted access to some contacts. Tap to add more.
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.gold[700]}
      />
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = (message: string) => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 400 }}
    >
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="account-search-outline"
          size={48}
          color={colors.cream[400]}
        />
        <Text style={styles.emptyStateText}>{message}</Text>
      </View>
    </MotiView>
  );

  // Determine which list to show
  const isSearchMode = searchQuery.length >= 2;
  const displayList: (MatchedUser | SearchResult)[] = isSearchMode
    ? searchResults
    : matchedContacts;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.white}
            />
          </TouchableOpacity>

          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <Text style={styles.headerTitle}>Find Friends</Text>
            <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
          </MotiView>
        </LinearGradient>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.cream[500]}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email"
              placeholderTextColor={colors.cream[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.cream[400]}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.burgundy[600]} />
          </View>
        ) : permission === 'denied' && !isSearchMode ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderPermissionDenied()}
          </ScrollView>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              !isSearchMode ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.burgundy[600]}
                  colors={[colors.burgundy[600]]}
                />
              ) : undefined
            }
          >
            {/* Limited access banner */}
            {permission === 'limited' && !isSearchMode && renderLimitedBanner()}

            {/* Searching indicator */}
            {searching && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" color={colors.burgundy[600]} />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}

            {/* Results list */}
            {!searching && displayList.length === 0 ? (
              renderEmptyState(
                isSearchMode
                  ? `No users found matching "${searchQuery}"`
                  : 'No contacts found on Wishlist yet'
              )
            ) : (
              !searching &&
              displayList.map((user, index) => (
                <MatchedContactCard
                  key={user.userId}
                  user={user}
                  onStatusChange={handleStatusChange}
                  index={index}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    top: 60,
    padding: spacing.sm,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.gold[200],
    fontWeight: '400',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cream[50],
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.gold[100],
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.burgundy[800],
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 2,
    borderColor: colors.gold[100],
    borderStyle: 'dashed',
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.burgundy[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 16,
    color: colors.burgundy[400],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: spacing.sm,
  },
  linkButtonText: {
    color: colors.burgundy[600],
    fontSize: 14,
    fontWeight: '500',
  },
  limitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold[100],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  limitedBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold[800],
  },
  limitedBannerText: {
    fontSize: 12,
    color: colors.gold[700],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.cream[500],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  searchingText: {
    fontSize: 14,
    color: colors.burgundy[600],
    marginLeft: spacing.sm,
  },
});
