// DEPRECATED: Use social.tsx - unified People screen with segmented control
// This file is kept for potential deep link compatibility during transition

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchUserGroups } from '../../../utils/groups';
import GroupCard from '../../../components/groups/GroupCard';
import CreateGroupModal from '../../../components/groups/CreateGroupModal';
import JoinGroupModal from '../../../components/groups/JoinGroupModal';
import { Group } from '../../../types';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Array<Group & { member_count?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const loadGroups = async () => {
    const { data } = await fetchUserGroups();
    if (data) {
      setGroups(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/group/${groupId}` as any);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50], alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '700',
                  color: colors.white,
                  marginBottom: spacing.xs,
                }}
              >
                {t('groups.title')}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.gold[200],
                  fontWeight: '400',
                }}
              >
                {groups.length} {t('groups.group', { count: groups.length })}
              </Text>
            </View>
          </MotiView>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.burgundy[600]}
              colors={[colors.burgundy[600]]}
            />
          }
        >
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.burgundy[700],
                borderRadius: borderRadius.lg,
                padding: spacing.md + spacing.xs,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                ...shadows.md,
              }}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={20}
                color={colors.white}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  color: colors.white,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                {t('groups.createGroup')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                padding: spacing.md + spacing.xs,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.burgundy[700],
              }}
              onPress={() => setJoinModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="account-multiple-plus"
                size={20}
                color={colors.burgundy[700]}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  color: colors.burgundy[700],
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                {t('groups.joinGroup')}
              </Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 200 }}
            >
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xxl,
                  alignItems: 'center',
                  marginTop: spacing.xl,
                  borderWidth: 2,
                  borderColor: colors.gold[100],
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.burgundy[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.lg,
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={60}
                    color={colors.burgundy[400]}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: colors.burgundy[800],
                    marginBottom: spacing.sm,
                    textAlign: 'center',
                  }}
                >
                  {t('groups.empty.noGroups')}
                </Text>

                <Text
                  style={{
                    fontSize: 16,
                    color: colors.burgundy[400],
                    textAlign: 'center',
                    lineHeight: 24,
                  }}
                >
                  {t('groups.empty.noGroupsDescription')}
                </Text>
              </View>
            </MotiView>
          ) : (
            groups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                onPress={() => handleGroupPress(group.id)}
                index={index}
              />
            ))
          )}
        </ScrollView>
      </View>

      <CreateGroupModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={loadGroups}
      />

      <JoinGroupModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onSuccess={loadGroups}
      />
    </>
  );
}
