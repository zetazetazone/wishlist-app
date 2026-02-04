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
import { updateGroupInfo } from '../../../utils/groups';
import { GroupAvatar } from '../../../components/groups/GroupAvatar';
import { InviteCodeSection } from '../../../components/groups/InviteCodeSection';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

interface GroupDetails {
  name: string;
  description: string | null;
  photo_url: string | null;
  mode: string | null;
  invite_code: string | null;
}

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editable form state (admin only)
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());

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

      // Fetch group details and membership role in parallel
      const [groupResult, membershipResult] = await Promise.all([
        supabase
          .from('groups')
          .select('name, description, photo_url, mode, invite_code')
          .eq('id', id)
          .single(),
        supabase
          .from('group_members')
          .select('role')
          .eq('group_id', id)
          .eq('user_id', user.id)
          .single(),
      ]);

      if (groupResult.data) {
        setGroup(groupResult.data);
      }

      setIsAdmin(membershipResult.data?.role === 'admin');
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

          {/* Members Section (visible to all) */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <SettingsSection
              title="Members"
              icon="account-multiple"
            >
              <Text style={styles.placeholderText}>
                Member management will appear here
              </Text>
            </SettingsSection>
          </MotiView>

          {/* Invite Code Section (visible to all) */}
          {group?.invite_code && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 300 }}
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
            transition={{ type: 'spring', delay: 400 }}
          >
            <SettingsSection
              title="Danger Zone"
              icon="alert-circle-outline"
              danger
            >
              {isAdmin ? (
                <Text style={styles.placeholderText}>
                  Transfer admin role will appear here
                </Text>
              ) : (
                <Text style={styles.placeholderText}>
                  Leave group will appear here
                </Text>
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
