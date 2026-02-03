import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface GroupPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: Array<{ id: string; name: string }>;
  currentFavoriteGroups: string[]; // Groups where this item is currently favorited
  onToggleGroup: (groupId: string) => void;
  itemTitle: string;
}

export function GroupPickerSheet({
  visible,
  onClose,
  groups,
  currentFavoriteGroups,
  onToggleGroup,
  itemTitle,
}: GroupPickerSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: colors.cream[50],
      }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.gold[100],
          backgroundColor: colors.white,
        }}>
          <View style={{ flex: 1 }}>
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
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={colors.burgundy[400]} />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <Text style={{
          fontSize: 14,
          color: colors.burgundy[500],
          padding: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
          Select which group(s) this item is your "Most Wanted" for:
        </Text>

        {/* Group List */}
        <ScrollView style={{ flex: 1, padding: spacing.lg, paddingTop: 0 }}>
          {groups.map(group => {
            const isSelected = currentFavoriteGroups.includes(group.id);
            return (
              <TouchableOpacity
                key={group.id}
                onPress={() => onToggleGroup(group.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.md,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.burgundy[400] : colors.gold[100],
                  ...shadows.sm,
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.burgundy[400] : colors.burgundy[200],
                  backgroundColor: isSelected ? colors.burgundy[400] : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
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
        </ScrollView>

        {/* Done Button */}
        <View style={{
          padding: spacing.lg,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gold[100],
        }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: colors.burgundy[700],
              borderRadius: borderRadius.md,
              padding: spacing.md,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: colors.white,
              fontSize: 16,
              fontWeight: '600',
            }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default GroupPickerSheet;
