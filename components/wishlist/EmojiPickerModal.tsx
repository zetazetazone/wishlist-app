import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface EmojiPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
}

const EMOJI_CATEGORIES = {
  favorites: ['❤️', '⭐', '🎁', '✨', '💫', '🌟', '💝', '🎀'],
  activities: ['🎯', '🎮', '📚', '🎨', '🎵', '✈️', '🏃', '🧘'],
  food: ['🍕', '🍰', '☕', '🍷', '🍦', '🥐', '🍣', '🍔'],
  nature: ['🌸', '🌺', '🌻', '🍀', '🌈', '🌙', '☀️', '⛅'],
  objects: ['👗', '👟', '💄', '👜', '💍', '🎒', '🛒', '📱'],
  symbols: ['💯', '🔥', '💎', '🏆', '🎪', '🎭', '🎢', '🎡'],
};

type CategoryKey = keyof typeof EMOJI_CATEGORIES;

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  favorites: 'Favorites',
  activities: 'Activities',
  food: 'Food',
  nature: 'Nature',
  objects: 'Objects',
  symbols: 'Symbols',
};

export function EmojiPickerModal({
  visible,
  onClose,
  onSelect,
  selectedEmoji,
}: EmojiPickerModalProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = React.useState<CategoryKey>('favorites');

  const handleEmojiPress = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('wishlists.chooseEmoji')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.burgundy[600]} />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {(Object.keys(EMOJI_CATEGORIES) as CategoryKey[]).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  activeCategory === category && styles.categoryTabActive,
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    activeCategory === category && styles.categoryTabTextActive,
                  ]}
                >
                  {CATEGORY_LABELS[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Emoji Grid */}
          <ScrollView style={styles.emojiScrollView} contentContainerStyle={styles.emojiGrid}>
            {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
              <Pressable
                key={emoji}
                style={({ pressed }) => [
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected,
                  pressed && styles.emojiButtonPressed,
                ]}
                onPress={() => handleEmojiPress(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
                {selectedEmoji === emoji && (
                  <View style={styles.checkmark}>
                    <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.burgundy[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  categoriesContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream[100],
  },
  categoryTabActive: {
    backgroundColor: colors.burgundy[600],
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.burgundy[700],
  },
  categoryTabTextActive: {
    color: colors.white,
  },
  emojiScrollView: {
    flex: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  emojiButton: {
    width: '25%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  emojiButtonPressed: {
    backgroundColor: colors.cream[100],
    transform: [{ scale: 0.95 }],
  },
  emojiButtonSelected: {
    backgroundColor: colors.cream[200],
    borderWidth: 2,
    borderColor: colors.burgundy[600],
  },
  emojiText: {
    fontSize: 40,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.burgundy[600],
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
