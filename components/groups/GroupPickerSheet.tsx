import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../providers/AuthProvider';
import { getUserGroups, UserGroup } from '../../lib/groups';

interface GroupPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (groupId: string | null) => void;
  selectedGroupId: string | null;
  allowNone?: boolean;
}

export function GroupPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedGroupId,
  allowNone = true,
}: GroupPickerSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && user) {
      setLoading(true);
      getUserGroups(user.id)
        .then(setGroups)
        .catch((err) => console.error('Failed to load groups:', err))
        .finally(() => setLoading(false));
    }
  }, [visible, user]);

  const handleSelect = (groupId: string | null) => {
    onSelect(groupId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{t('wishlists.selectGroup')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.burgundy[600]} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.burgundy[600]} />
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {allowNone && (
                <TouchableOpacity
                  style={[
                    styles.groupItem,
                    selectedGroupId === null && styles.groupItemSelected,
                  ]}
                  onPress={() => handleSelect(null)}
                >
                  <View style={styles.groupIconPlaceholder}>
                    <MaterialCommunityIcons
                      name="cancel"
                      size={24}
                      color={colors.cream[500]}
                    />
                  </View>
                  <Text style={styles.groupName}>{t('wishlists.noGroupLink')}</Text>
                  {selectedGroupId === null && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.burgundy[600]}
                    />
                  )}
                </TouchableOpacity>
              )}

              {groups.map((group) => {
                const isSelected = selectedGroupId === group.id;
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupItem,
                      isSelected && styles.groupItemSelected,
                    ]}
                    onPress={() => handleSelect(group.id)}
                  >
                    {group.photo_url ? (
                      <Image
                        source={{ uri: group.photo_url }}
                        style={styles.groupImage}
                      />
                    ) : (
                      <View style={styles.groupIconPlaceholder}>
                        <MaterialCommunityIcons
                          name="account-group"
                          size={24}
                          color={colors.cream[500]}
                        />
                      </View>
                    )}
                    <Text style={styles.groupName} numberOfLines={1}>
                      {group.name}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color={colors.burgundy[600]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {groups.length === 0 && (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={48}
                    color={colors.cream[400]}
                  />
                  <Text style={styles.emptyText}>{t('wishlists.noGroupsToLink')}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    ...shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.cream[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.burgundy[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.cream[50],
  },
  groupItemSelected: {
    backgroundColor: colors.burgundy[50],
    borderWidth: 1,
    borderColor: colors.burgundy[300],
  },
  groupImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  groupIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cream[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.cream[500],
    textAlign: 'center',
  },
});
