import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchUserGroups } from '../../../utils/groups';
import GroupCard from '../../../components/groups/GroupCard';
import CreateGroupModal from '../../../components/groups/CreateGroupModal';
import JoinGroupModal from '../../../components/groups/JoinGroupModal';
import { Group } from '../../../types';

export default function GroupsScreen() {
  const router = useRouter();
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
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="p-6">
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              className="flex-1 bg-primary-500 rounded-lg p-4"
              onPress={() => setCreateModalVisible(true)}
            >
              <Text className="text-white text-center font-semibold text-base">
                + Create Group
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white border-2 border-primary-500 rounded-lg p-4"
              onPress={() => setJoinModalVisible(true)}
            >
              <Text className="text-primary-500 text-center font-semibold text-base">
                Join Group
              </Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Text className="text-6xl mb-4">👥</Text>
              <Text className="text-gray-600 text-center text-lg font-medium mb-2">
                No groups yet
              </Text>
              <Text className="text-gray-500 text-center text-sm">
                Create a group or ask a friend for an invite code to get started
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-gray-500 text-sm font-medium mb-3">
                MY GROUPS ({groups.length})
              </Text>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => handleGroupPress(group.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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
