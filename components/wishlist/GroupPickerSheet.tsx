import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

type ItemType = 'standard' | 'surprise_me' | 'mystery_box';

interface GroupPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: Array<{ id: string; name: string }>;
  selectedGroupIds: string[]; // Groups where this item is currently Most Wanted
  onSelectGroup: (groupId: string) => void; // For standard items (single select)
  onToggleGroup: (groupId: string) => void; // For special items (multi select)
  itemTitle: string;
  itemType: ItemType;
}

export function GroupPickerSheet({
  visible,
  onClose,
  groups,
  selectedGroupIds,
  onSelectGroup,
  onToggleGroup,
  itemTitle,
  itemType,
}: GroupPickerSheetProps) {
  const isSpecialItem = itemType === 'surprise_me' || itemType === 'mystery_box';
  const currentGroupId = selectedGroupIds[0] || null; // For standard items

  const handleSelect = (groupId: string) => {
    if (isSpecialItem) {
      // Multi-select: toggle this group
      onToggleGroup(groupId);
    } else {
      // Single-select: select this group and close
      onSelectGroup(groupId);
      onClose();
    }
  };

  const getHeaderText = () => {
    if (isSpecialItem) {
      return itemType === 'surprise_me'
        ? 'Select Groups for Surprise Me'
        : 'Select Groups for Mystery Box';
    }
    return 'Mark as Most Wanted';
  };

  const getSubtitle = () => {
    if (isSpecialItem) {
      return 'Can be selected in multiple groups';
    }
    return itemTitle;
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
            maxHeight: '70%',
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
              {getHeaderText()}
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.burgundy[400],
              marginTop: 4,
            }} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>

          {/* Group List */}
          <ScrollView style={{ paddingHorizontal: spacing.lg }}>
            {groups.map(group => {
              const isSelected = selectedGroupIds.includes(group.id);
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
                  {/* Selection indicator */}
                  {isSpecialItem ? (
                    // Checkbox for special items (multi-select)
                    <View style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.burgundy[400] : colors.burgundy[200],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                      backgroundColor: isSelected ? colors.burgundy[400] : 'transparent',
                    }}>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color={colors.white}
                        />
                      )}
                    </View>
                  ) : (
                    // Radio button for standard items (single-select)
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
                  )}
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

            {/* Done button for special items (multi-select mode) */}
            {isSpecialItem && (
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  backgroundColor: colors.burgundy[600],
                  borderRadius: borderRadius.md,
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.white,
                }}>
                  Done
                </Text>
              </TouchableOpacity>
            )}

            {/* Change selection hint for standard items */}
            {!isSpecialItem && currentGroupId && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.md,
                marginTop: spacing.xs,
              }}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={colors.burgundy[300]}
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={{
                  fontSize: 13,
                  color: colors.burgundy[300],
                  textAlign: 'center',
                }}>
                  Standard items can only be Most Wanted in one group
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default GroupPickerSheet;
