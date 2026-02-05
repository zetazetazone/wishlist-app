import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';
import { uploadGroupPhotoFromUri } from '../../../lib/storage';
import { updateGroupInfo, updateGroupMode, removeMember, transferAdmin, leaveGroup } from '../../../utils/groups';
import { GroupAvatar } from '../../../components/groups/GroupAvatar';
import { GroupModeBadge } from '../../../components/groups/GroupModeBadge';
import { BudgetSettingsSection } from '../../../components/groups/BudgetSettingsSection';
import { InviteCodeSection } from '../../../components/groups/InviteCodeSection';
import { MemberListItem } from '../../../components/groups/MemberListItem';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

interface GroupDetails {
  name: string;
  description: string | null;
  photo_url: string | null;
  mode: string | null;
  invite_code: string | null;
  budget_approach: string | null;
  budget_amount: number | null; // cents
}

interface MemberInfo {
  user_id: string;
  role: 'admin' | 'member';
  full_name: string;
  avatar_url: string | null;
}

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Editable form state (admin only)
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, [id]);

  // Initialize form state when group data loads
  useEffect(() => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || '');
    }
  }, [group?.name, group?.description]);

  const loadSettingsData = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      setCurrentUserId(user.id);

      // Fetch group details, membership role, and all members in parallel
      const [groupResult, membershipResult, membersResult] = await Promise.all([
        supabase
          .from('groups')
          .select('name, description, photo_url, mode, invite_code, budget_approach, budget_amount')
          .eq('id', id)
          .single(),
        supabase
          .from('group_members')
          .select('role')
          .eq('group_id', id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('group_members')
          .select(`
            user_id,
            role,
            users (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('group_id', id),
      ]);

      if (groupResult.data) {
        setGroup(groupResult.data);
      }

      setIsAdmin(membershipResult.data?.role === 'admin');

      // Transform members data
      if (membersResult.data) {
        const transformedMembers: MemberInfo[] = membersResult.data.map((m: any) => ({
          user_id: m.user_id,
          role: m.role as 'admin' | 'member',
          full_name: m.users?.full_name || 'Unknown',
          avatar_url: m.users?.avatar_url || null,
        }));
        // Sort: admin first, then alphabetical
        transformedMembers.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return a.full_name.localeCompare(b.full_name);
        });
        setMembers(transformedMembers);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if admin form has unsaved changes
  const hasChanges = group
    ? editName.trim() !== group.name || editDescription.trim() !== (group.description || '')
    : false;

  const handleSaveInfo = async () => {
    if (!id || !group) return;
    if (!editName.trim()) {
      Alert.alert('Required', 'Group name cannot be empty');
      return;
    }

    setIsSaving(true);
    const previousName = group.name;
    const previousDescription = group.description;

    // Optimistic update
    setGroup(prev => prev ? {
      ...prev,
      name: editName.trim(),
      description: editDescription.trim() || null,
    } : prev);

    try {
      const { error } = await updateGroupInfo(id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });

      if (error) throw error;
      Alert.alert('Saved', 'Group info updated successfully');
    } catch (error) {
      console.error('Error saving group info:', error);
      // Rollback optimistic update
      setGroup(prev => prev ? {
        ...prev,
        name: previousName,
        description: previousDescription,
      } : prev);
      setEditName(previousName);
      setEditDescription(previousDescription || '');
      Alert.alert('Error', 'Failed to save group info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!id) return;

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      // Launch image picker with 16:9 aspect for group photos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (result.canceled) return;

      setIsUploadingPhoto(true);
      const uri = result.assets[0].uri;

      // Upload compressed photo
      const storagePath = await uploadGroupPhotoFromUri(uri, id);
      if (!storagePath) {
        Alert.alert('Error', 'Failed to upload photo');
        return;
      }

      // Update group record with new photo path
      const { error } = await updateGroupInfo(id, { photo_url: storagePath });
      if (error) throw error;

      // Update local state
      setGroup(prev => prev ? { ...prev, photo_url: storagePath } : prev);
      setPhotoTimestamp(Date.now()); // Force avatar refresh
    } catch (error) {
      console.error('Error changing group photo:', error);
      Alert.alert('Error', 'Failed to update group photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveMember = (member: MemberInfo) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.full_name} from the group? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeMember(id!, member.user_id);
            if (error) {
              Alert.alert('Error', 'Failed to remove member');
            } else {
              setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
            }
          },
        },
      ]
    );
  };

  const handleMakeAdmin = (member: MemberInfo) => {
    Alert.alert(
      'Transfer Admin Role',
      `Are you sure you want to make ${member.full_name} the group admin? You will become a regular member and lose admin privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await transferAdmin(id!, member.user_id);
            if (error) {
              Alert.alert('Error', 'Failed to transfer admin role');
            } else {
              // Update local state: demote self, promote target
              setMembers(prev => prev.map(m => ({
                ...m,
                role: m.user_id === member.user_id ? 'admin' as const : m.user_id === currentUserId ? 'member' as const : m.role,
              })));
              setIsAdmin(false);
              Alert.alert('Done', `${member.full_name} is now the group admin.`);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will need an invite code to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await leaveGroup(id!);
            if (error) {
              Alert.alert('Error', 'Failed to leave group');
            } else {
              router.replace('/(app)/(tabs)/groups');
            }
          },
        },
      ]
    );
  };

  const handleModeSwitch = (newMode: 'greetings' | 'gifts') => {
    if (!id || !group || isSwitchingMode) return;
    const currentMode = (group.mode as 'greetings' | 'gifts') || 'gifts';
    if (newMode === currentMode) return;

    const isToGreetings = newMode === 'greetings';

    Alert.alert(
      isToGreetings ? 'Switch to Greetings Mode?' : 'Switch to Gifts Mode?',
      isToGreetings
        ? 'The following features will be hidden from all members:\n\n\u2022 Wishlists and favorite items\n\u2022 Gift Leader assignments\n\u2022 Contribution tracking\n\nExisting gift data will be preserved and will reappear if you switch back to Gifts mode.'
        : 'The following features will become visible to all members:\n\n\u2022 Wishlists and favorite items\n\u2022 Gift Leader assignments\n\u2022 Contribution tracking\n\nMembers will be able to coordinate gifts for upcoming birthdays.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isToGreetings ? 'Switch to Greetings' : 'Switch to Gifts',
          style: isToGreetings ? 'destructive' : 'default',
          onPress: async () => {
            setIsSwitchingMode(true);
            const previousMode = group.mode;

            // Optimistic update
            setGroup(prev => prev ? { ...prev, mode: newMode } : prev);

            try {
              const { error } = await updateGroupMode(id, newMode);
              if (error) throw error;

              const modeName = newMode === 'greetings' ? 'Greetings' : 'Gifts';
              Alert.alert(
                'Mode Changed',
                `This group is now in ${modeName} mode. Members will see the change on their next visit.`
              );
            } catch (error) {
              console.error('Error switching mode:', error);
              // Rollback optimistic update
              setGroup(prev => prev ? { ...prev, mode: previousMode } : prev);
              Alert.alert('Error', 'Failed to change group mode. Please try again.');
            } finally {
              setIsSwitchingMode(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50], alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: borderRadius.full,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={colors.white}
                />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: colors.white,
                }}
              >
                Group Settings
              </Text>
            </View>
          </MotiView>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxl,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Info Section (admin only) */}
          {isAdmin && group && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 100 }}
            >
              <SettingsSection
                title="Group Info"
                icon="information-outline"
              >
                {/* Group Photo */}
                <View style={settingsStyles.photoSection}>
                  <View style={settingsStyles.avatarWrapper}>
                    <GroupAvatar
                      group={{
                        name: group.name,
                        photo_url: group.photo_url,
                      }}
                      size="xl"
                    />
                    {isUploadingPhoto && (
                      <View style={settingsStyles.photoOverlay}>
                        <ActivityIndicator size="small" color={colors.white} />
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={handleChangePhoto}
                    disabled={isUploadingPhoto}
                    activeOpacity={0.7}
                  >
                    <Text style={settingsStyles.changePhotoText}>
                      {isUploadingPhoto ? 'Uploading...' : group.photo_url ? 'Change Photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Group Name Input */}
                <View style={settingsStyles.fieldContainer}>
                  <Text style={settingsStyles.fieldLabel}>Group Name</Text>
                  <TextInput
                    style={settingsStyles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter group name"
                    placeholderTextColor={colors.cream[500]}
                    autoCapitalize="words"
                    maxLength={50}
                  />
                </View>

                {/* Group Description Input */}
                <View style={settingsStyles.fieldContainer}>
                  <Text style={settingsStyles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[settingsStyles.textInput, settingsStyles.textArea]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Add a group description (optional)"
                    placeholderTextColor={colors.cream[500]}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={200}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[
                    settingsStyles.saveButton,
                    (!hasChanges || isSaving) && settingsStyles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveInfo}
                  disabled={!hasChanges || isSaving}
                  activeOpacity={0.7}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={settingsStyles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </SettingsSection>
            </MotiView>
          )}

          {/* Group Mode Section (visible to all) */}
          {group && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: isAdmin ? 150 : 100 }}
            >
              <SettingsSection
                title="Group Mode"
                icon="swap-horizontal"
              >
                {isAdmin ? (
                  <View>
                    <View style={modeStyles.cardRow}>
                      {/* Greetings Card */}
                      <TouchableOpacity
                        style={[
                          modeStyles.modeCard,
                          (group.mode || 'gifts') === 'greetings'
                            ? modeStyles.modeCardGreetingsActive
                            : modeStyles.modeCardInactive,
                        ]}
                        onPress={() => handleModeSwitch('greetings')}
                        disabled={isSwitchingMode}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name="party-popper"
                          size={28}
                          color={(group.mode || 'gifts') === 'greetings' ? colors.gold[700] : colors.cream[500]}
                          style={{ marginBottom: spacing.xs }}
                        />
                        <Text
                          style={[
                            modeStyles.modeCardText,
                            (group.mode || 'gifts') === 'greetings'
                              ? modeStyles.modeCardTextGreetingsActive
                              : modeStyles.modeCardTextInactive,
                          ]}
                        >
                          Greetings
                        </Text>
                      </TouchableOpacity>

                      {/* Gifts Card */}
                      <TouchableOpacity
                        style={[
                          modeStyles.modeCard,
                          (group.mode || 'gifts') === 'gifts'
                            ? modeStyles.modeCardGiftsActive
                            : modeStyles.modeCardInactive,
                        ]}
                        onPress={() => handleModeSwitch('gifts')}
                        disabled={isSwitchingMode}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name="gift"
                          size={28}
                          color={(group.mode || 'gifts') === 'gifts' ? colors.burgundy[700] : colors.cream[500]}
                          style={{ marginBottom: spacing.xs }}
                        />
                        <Text
                          style={[
                            modeStyles.modeCardText,
                            (group.mode || 'gifts') === 'gifts'
                              ? modeStyles.modeCardTextGiftsActive
                              : modeStyles.modeCardTextInactive,
                          ]}
                        >
                          Gifts
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {isSwitchingMode && (
                      <ActivityIndicator
                        size="small"
                        color={colors.burgundy[600]}
                        style={{ marginTop: spacing.sm }}
                      />
                    )}
                    <Text style={modeStyles.infoText}>
                      Controls which features are visible to group members
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={modeStyles.readOnlyLabel}>Current mode</Text>
                    <GroupModeBadge mode={(group.mode as 'greetings' | 'gifts') || 'gifts'} />
                    <Text style={modeStyles.readOnlyInfo}>
                      Only the group admin can change the mode.
                    </Text>
                  </View>
                )}
              </SettingsSection>
            </MotiView>
          )}

          {/* Budget Settings Section (admin only, gifts mode only) */}
          {isAdmin && group && (group.mode || 'gifts') === 'gifts' && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 200 }}
            >
              <SettingsSection
                title="Budget"
                icon="cash-multiple"
              >
                <BudgetSettingsSection
                  currentApproach={group.budget_approach as any}
                  currentAmount={group.budget_amount}
                  groupId={id!}
                  onBudgetUpdated={(approach, amount) =>
                    setGroup(prev =>
                      prev
                        ? { ...prev, budget_approach: approach, budget_amount: amount }
                        : prev
                    )
                  }
                />
              </SettingsSection>
            </MotiView>
          )}

          {/* Members Section (visible to all) */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: isAdmin ? 300 : 200 }}
          >
            <SettingsSection
              title={`Members (${members.length})`}
              icon="account-multiple"
            >
              {members.map((member) => (
                <MemberListItem
                  key={member.user_id}
                  member={member}
                  isCurrentUser={member.user_id === currentUserId}
                  isViewerAdmin={isAdmin}
                  onRemove={() => handleRemoveMember(member)}
                  onMakeAdmin={() => handleMakeAdmin(member)}
                />
              ))}
              {members.length === 0 && (
                <Text style={styles.placeholderText}>
                  No members found
                </Text>
              )}
            </SettingsSection>
          </MotiView>

          {/* Invite Code Section (visible to all) */}
          {group?.invite_code && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: isAdmin ? 400 : 300 }}
            >
              <SettingsSection
                title="Invite Code"
                icon="link-variant"
              >
                <InviteCodeSection
                  inviteCode={group.invite_code}
                  groupId={id!}
                  groupName={group.name}
                  onCodeRegenerated={(newCode) =>
                    setGroup(prev => prev ? { ...prev, invite_code: newCode } : prev)
                  }
                />
              </SettingsSection>
            </MotiView>
          )}

          {/* Danger Zone Section */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: isAdmin ? 500 : 400 }}
          >
            <SettingsSection
              title="Danger Zone"
              icon="alert-circle-outline"
              danger
            >
              {isAdmin ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={16}
                      color={colors.cream[600]}
                      style={{ marginRight: spacing.xs }}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.cream[600],
                        flex: 1,
                      }}
                    >
                      To leave this group, first transfer the admin role to another member using the shield icon in the Members section above.
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.cream[600],
                      marginBottom: spacing.md,
                    }}
                  >
                    You will need an invite code to rejoin this group after leaving.
                  </Text>
                  <TouchableOpacity
                    onPress={handleLeaveGroup}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.error,
                      borderRadius: borderRadius.md,
                      paddingVertical: spacing.sm + 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons
                        name="logout"
                        size={18}
                        color={colors.white}
                        style={{ marginRight: spacing.sm }}
                      />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: colors.white,
                        }}
                      >
                        Leave Group
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </SettingsSection>
          </MotiView>
        </ScrollView>
      </View>
    </>
  );
}

// Reusable settings section card component
function SettingsSection({
  title,
  icon,
  danger,
  children,
}: {
  title: string;
  icon: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
        ...(danger ? { borderWidth: 1, borderColor: colors.error } : {}),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={danger ? colors.error : colors.burgundy[700]}
          style={{ marginRight: spacing.sm }}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: danger ? colors.error : colors.burgundy[800],
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = {
  placeholderText: {
    fontSize: 14,
    color: colors.cream[600],
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    paddingVertical: spacing.md,
  },
};

const modeStyles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  modeCardGreetingsActive: {
    backgroundColor: colors.gold[100],
    borderColor: colors.gold[300],
  },
  modeCardGiftsActive: {
    backgroundColor: colors.burgundy[100],
    borderColor: colors.burgundy[300],
  },
  modeCardInactive: {
    backgroundColor: colors.white,
    borderColor: colors.cream[300],
  },
  modeCardText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modeCardTextGreetingsActive: {
    color: colors.gold[700],
  },
  modeCardTextGiftsActive: {
    color: colors.burgundy[700],
  },
  modeCardTextInactive: {
    color: colors.cream[500],
  },
  infoText: {
    fontSize: 12,
    color: colors.cream[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  readOnlyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cream[700],
    marginBottom: spacing.sm,
  },
  readOnlyInfo: {
    fontSize: 12,
    color: colors.cream[500],
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

const settingsStyles = StyleSheet.create({
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[600],
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cream[700],
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cream[400],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.black,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm + 2,
  },
  saveButton: {
    backgroundColor: colors.burgundy[700],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
