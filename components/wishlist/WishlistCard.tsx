import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { Wishlist } from '../../lib/wishlists';

interface WishlistCardProps {
  wishlist: Wishlist;
  onLongPress: () => void;
  isActive: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  itemCount?: number;
}

export default function WishlistCard({
  wishlist,
  onLongPress,
  isActive,
  onPress,
  onEdit,
  onDelete,
  itemCount = 0,
}: WishlistCardProps) {
  const displayEmoji = wishlist.emoji || '📋';

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        isActive && styles.cardActive,
      ]}
    >
      <View style={styles.content}>
        {/* Left: Emoji */}
        <Text style={styles.emoji}>{displayEmoji}</Text>

        {/* Middle: Name and badges */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {wishlist.name}
            </Text>
            {wishlist.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemCount}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Right: Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onEdit}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={20}
              color={colors.burgundy[600]}
            />
          </TouchableOpacity>

          {!wishlist.is_default && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={colors.burgundy[400]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold[100],
    ...shadows.sm,
  },
  cardActive: {
    backgroundColor: colors.burgundy[50],
    borderColor: colors.burgundy[400],
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
    ...shadows.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.burgundy[900],
    marginRight: spacing.sm,
  },
  defaultBadge: {
    backgroundColor: colors.gold[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  itemCount: {
    fontSize: 13,
    color: colors.burgundy[600],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
});
