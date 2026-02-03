import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface GroupPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: Array<{ id: string; name: string }>;
  currentFavoriteGroupId: string | null; // Single group where this item is currently favorited
  onSelectGroup: (groupId: string) => void;
  itemTitle: string;
}

export function GroupPickerSheet({
  visible,
  onClose,
  groups,
  currentFavoriteGroupId,
  onSelectGroup,
  itemTitle,
}: GroupPickerSheetProps) {
  const handleSelect = (groupId: string) => {
    onSelectGroup(groupId);
    onClose(); // Auto-close after selection
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        {/* Sheet */}
        <Pressable
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            paddingBottom: spacing.xl,
            maxHeight: '60%',
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={{
            alignItems: 'center',
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
          }}>
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: colors.burgundy[200],
              borderRadius: 2,
            }} />
          </View>

          {/* Header */}
          <View style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.burgundy[900],
            }}>
              Mark as Most Wanted
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.burgundy[400],
              marginTop: 4,
            }} numberOfLines={1}>
              {itemTitle}
            </Text>
          </View>

          {/* Group List */}
          <View style={{ paddingHorizontal: spacing.lg }}>
            {groups.map(group => {
              const isSelected = currentFavoriteGroupId === group.id;
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => handleSelect(group.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    backgroundColor: isSelected ? colors.burgundy[50] : colors.cream[50],
                    borderRadius: borderRadius.md,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.burgundy[400] : colors.gold[100],
                  }}
                >
                  {/* Radio button */}
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.burgundy[400] : colors.burgundy[200],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                  }}>
                    {isSelected && (
                      <View style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: colors.burgundy[400],
                      }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.burgundy[800],
                    }}>
                      {group.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="heart"
                      size={20}
                      color={colors.burgundy[400]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Clear selection option */}
            {currentFavoriteGroupId && (
              <TouchableOpacity
                onPress={() => handleSelect(currentFavoriteGroupId)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.md,
                  marginTop: spacing.sm,
                }}
              >
                <MaterialCommunityIcons
                  name="heart-off-outline"
                  size={18}
                  color={colors.burgundy[400]}
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={{
                  fontSize: 14,
                  color: colors.burgundy[400],
                }}>
                  Remove from Most Wanted
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default GroupPickerSheet;
