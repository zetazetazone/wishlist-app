import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';
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

  useEffect(() => {
    loadSettingsData();
  }, [id]);

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
          {isAdmin && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 100 }}
            >
              <SettingsSection
                title="Group Info"
                icon="information-outline"
              >
                <Text style={styles.placeholderText}>
                  Group info editing will appear here
                </Text>
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
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 300 }}
          >
            <SettingsSection
              title="Invite Code"
              icon="link-variant"
            >
              <Text style={styles.placeholderText}>
                Invite code management will appear here
              </Text>
            </SettingsSection>
          </MotiView>

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
