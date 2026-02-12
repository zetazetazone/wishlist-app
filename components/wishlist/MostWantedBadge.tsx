import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface MostWantedBadgeProps {
  groupName?: string; // Optional: show "MOST WANTED in [Group]"
  allGroups?: boolean; // Optional: show "MOST WANTED in all groups"
}

export function MostWantedBadge({ groupName, allGroups }: MostWantedBadgeProps) {
  const { t } = useTranslation();

  const getBadgeText = () => {
    if (allGroups) {
      return `♥ ${t('wishlist.favorite.mostWantedAllGroups')}`;
    }
    if (groupName) {
      return `♥ ${t('wishlist.favorite.mostWantedInGroup', { group: groupName })}`;
    }
    return `♥ ${t('wishlist.favorite.mostWanted')}`;
  };

  return (
    <View
      style={{
        backgroundColor: colors.burgundy[100],
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.burgundy[700],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        }}
        numberOfLines={1}
      >
        {getBadgeText()}
      </Text>
    </View>
  );
}

export default MostWantedBadge;
