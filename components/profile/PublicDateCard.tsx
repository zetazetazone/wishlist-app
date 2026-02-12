import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalizedFormat } from '../../hooks/useLocalizedFormat';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { PublicDate } from '../../lib/publicDates';

interface PublicDateCardProps {
  date: PublicDate;
  onEdit: () => void;
  onDelete: () => void;
  index?: number; // For staggered animation
}

/**
 * PublicDateCard - Public date list item component
 *
 * Displays:
 * - Calendar icon on left
 * - Title (bold, burgundy)
 * - Formatted date (MMMM d) with year indicator
 * - Optional description (smaller, gray)
 * - Delete button on right (trash icon)
 *
 * Uses staggered slide-in animation matching friend card pattern.
 * Entire card is tappable for edit; delete button has separate handler.
 *
 * CRITICAL: Date formatting uses month - 1 because Date constructor expects 0-indexed months,
 * but database stores 1-indexed months (1-12).
 */
export function PublicDateCard({ date, onEdit, onDelete, index = 0 }: PublicDateCardProps) {
  const { t } = useTranslation();
  const { format } = useLocalizedFormat();

  // Format date: Use any year (2000) for display since we only care about month/day
  // CRITICAL: month - 1 because Date constructor uses 0-indexed months
  const formattedDate = format(new Date(2000, date.month - 1, date.day), 'MMMM d');

  // Add year indicator
  const dateWithYear = date.year
    ? `${formattedDate} (${date.year})`
    : `${formattedDate} (${t('profile.personalDetails.annual')})`;

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: 150 + index * 50 }}
    >
      <TouchableOpacity
        onPress={onEdit}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.white,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          borderWidth: 2,
          borderColor: colors.gold[100],
          marginBottom: spacing.sm,
          ...shadows.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Calendar Icon */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.burgundy[100],
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}
          >
            <MaterialCommunityIcons
              name="calendar-heart"
              size={28}
              color={colors.burgundy[700]}
            />
          </View>

          {/* Date Info Column */}
          <View style={{ flex: 1 }}>
            {/* Row 1: Title */}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.xs,
              }}
              numberOfLines={1}
            >
              {date.title}
            </Text>

            {/* Row 2: Formatted Date with Year Indicator */}
            <Text
              style={{
                fontSize: 14,
                color: colors.cream[500],
                fontWeight: '500',
                marginBottom: date.description ? spacing.xs : 0,
              }}
            >
              {dateWithYear}
            </Text>

            {/* Row 3: Description (if present) */}
            {date.description && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.cream[400],
                  fontWeight: '400',
                }}
                numberOfLines={2}
              >
                {date.description}
              </Text>
            )}
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              padding: spacing.xs,
              marginLeft: spacing.sm,
            }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

export default PublicDateCard;
