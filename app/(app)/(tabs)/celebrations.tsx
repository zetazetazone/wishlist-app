/**
 * Celebrations Tab Screen
 * Shows list of celebrations the user can participate in (excludes own birthdays)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getCelebrations, type Celebration } from '../../../lib/celebrations';
import { CelebrationCard } from '../../../components/celebrations/CelebrationCard';

export default function CelebrationsScreen() {
  const router = useRouter();
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load celebrations
  const loadCelebrations = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }
      setCurrentUserId(user.id);

      const data = await getCelebrations(user.id);
      setCelebrations(data);
    } catch (err) {
      console.error('Failed to load celebrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load celebrations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCelebrations();
  }, [loadCelebrations]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadCelebrations();
    }, [loadCelebrations])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCelebrations();
  }, [loadCelebrations]);

  // Navigate to celebration detail
  const handleCelebrationPress = (celebration: Celebration) => {
    router.push(`/celebration/${celebration.id}`);
  };

  // Check if current user is the Gift Leader
  const isUserGiftLeader = (celebration: Celebration): boolean => {
    return currentUserId !== null && celebration.gift_leader_id === currentUserId;
  };

  // Render celebration item
  const renderItem = ({ item }: { item: Celebration }) => (
    <CelebrationCard
      celebration={item}
      isGiftLeader={isUserGiftLeader(item)}
      onPress={() => handleCelebrationPress(item)}
    />
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B1538" />
        <Text style={styles.loadingText}>Loading celebrations...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={loadCelebrations}>
          Tap to retry
        </Text>
      </View>
    );
  }

  // Empty state
  if (celebrations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Celebrations</Text>
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="party-popper" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No upcoming celebrations</Text>
          <Text style={styles.emptySubtitle}>
            When celebrations are created in your groups, they'll appear here.
          </Text>
        </View>
      </View>
    );
  }

  // List of Gift Leader celebrations
  const giftLeaderCelebrations = celebrations.filter(c => isUserGiftLeader(c));
  const otherCelebrations = celebrations.filter(c => !isUserGiftLeader(c));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Celebrations</Text>
        {giftLeaderCelebrations.length > 0 && (
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="crown" size={16} color="#8B1538" />
            <Text style={styles.headerBadgeText}>
              Leading {giftLeaderCelebrations.length}
            </Text>
          </View>
        )}
      </View>

      <FlashList
        data={celebrations}
        renderItem={renderItem}
        estimatedItemSize={130}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B1538"
            colors={['#8B1538']}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          giftLeaderCelebrations.length > 0 ? (
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="star" size={18} color="#8B1538" />
              <Text style={styles.sectionTitle}>
                You are the Gift Leader for {giftLeaderCelebrations.length} celebration{giftLeaderCelebrations.length > 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B1538',
  },
  listContent: {
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B1538',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8B1538',
    textDecorationLine: 'underline',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
