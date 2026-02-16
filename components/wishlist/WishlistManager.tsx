import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { useWishlists, useReorderWishlists } from '../../hooks/useWishlists';
import { Wishlist } from '../../lib/wishlists';
import WishlistCard from './WishlistCard';

const AGGREGATE_VIEW_KEY = 'wishlist_aggregate_view';

export function WishlistManager() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: wishlists, isLoading, refetch } = useWishlists();
  const reorderMutation = useReorderWishlists();

  const [showAggregateView, setShowAggregateView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for modals (to be wired in Plan 03)
  const [editingWishlist, setEditingWishlist] = useState<Wishlist | null>(null);
  const [deletingWishlist, setDeletingWishlist] = useState<Wishlist | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load aggregate view preference on mount
  useEffect(() => {
    AsyncStorage.getItem(AGGREGATE_VIEW_KEY).then(value => {
      if (value === 'true') {
        setShowAggregateView(true);
      }
    });
  }, []);

  const handleDragEnd = ({ data }: { data: Wishlist[] }) => {
    const updates = data.map((w, index) => ({ id: w.id, sort_order: index }));
    reorderMutation.mutate(updates);
  };

  const handleToggleAggregate = async (value: boolean) => {
    setShowAggregateView(value);
    await AsyncStorage.setItem(AGGREGATE_VIEW_KEY, value.toString());

    // Navigate to main wishlist view with aggregate mode if enabled
    if (value) {
      router.push({ pathname: '/', params: { aggregate: 'true' } });
    } else {
      router.push('/');
    }
  };

  const handleWishlistPress = (wishlist: Wishlist) => {
    // Navigate to main wishlist view with this wishlist selected
    router.push({ pathname: '/', params: { wishlistId: wishlist.id } });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Wishlist>) => (
    <ScaleDecorator>
      <WishlistCard
        wishlist={item}
        onLongPress={drag}
        isActive={isActive}
        onPress={() => handleWishlistPress(item)}
        onEdit={() => setEditingWishlist(item)}
        onDelete={() => setDeletingWishlist(item)}
      />
    </ScaleDecorator>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('wishlists.myWishlists')}</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.addButton}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Aggregate view toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleLabelContainer}>
            <MaterialCommunityIcons
              name="view-list"
              size={20}
              color={colors.burgundy[600]}
            />
            <Text style={styles.toggleLabel}>{t('wishlists.aggregateView')}</Text>
          </View>
          <Switch
            value={showAggregateView}
            onValueChange={handleToggleAggregate}
            trackColor={{
              false: colors.cream[300],
              true: colors.burgundy[400],
            }}
            thumbColor={showAggregateView ? colors.burgundy[600] : colors.cream[600]}
          />
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          {t('wishlists.longPressToReorder')}
        </Text>
      </View>

      {/* Draggable List */}
      <DraggableFlatList
        data={wishlists || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.burgundy[600]}
            colors={[colors.burgundy[600]]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={64}
              color={colors.cream[400]}
            />
            <Text style={styles.emptyText}>{t('wishlists.noWishlists')}</Text>
          </View>
        }
      />

      {/* TODO: Add modals for edit, delete, and create in Plan 03 */}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream[100],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream[100],
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.burgundy[900],
  },
  addButton: {
    backgroundColor: colors.burgundy[600],
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cream[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.burgundy[800],
    fontWeight: '500',
  },
  instructions: {
    fontSize: 13,
    color: colors.burgundy[600],
    fontStyle: 'italic',
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.cream[600],
    marginTop: spacing.md,
  },
});

export default WishlistManager;
