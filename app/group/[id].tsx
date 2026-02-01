import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchGroupDetails } from '../../utils/groups';
import { Group, User } from '../../types';

interface GroupWithMembers extends Group {
  members: Array<{
    role: string;
    users: User;
  }>;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

  const loadGroupDetails = async () => {
    if (!id) return;

    setLoading(true);
    const { data, error } = await fetchGroupDetails(id);
    setLoading(false);

    if (error || !data) {
      Alert.alert('Error', 'Failed to load group details');
      router.back();
      return;
    }

    setGroup(data as GroupWithMembers);
  };

  const handleShare = async () => {
    if (!group) return;

    try {
      await Share.share({
        message: `Join "${group.name}" on Wishlist App!\n\nInvite Code: ${group.id}\n\nUse this code to join our gift-giving group.`,
        title: `Join ${group.name}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyInviteCode = () => {
    if (!group) return;
    // Note: Clipboard API would be used here in a full implementation
    Alert.alert(
      'Invite Code',
      group.id,
      [
        { text: 'Share', onPress: handleShare },
        { text: 'Close' },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Group Not Found' }} />
        <Text className="text-gray-600">Group not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: group.name,
          headerShown: true,
        }}
      />
      <ScrollView className="flex-1 bg-gray-50">
        <View className="p-6">
          {/* Group Info Card */}
          <View className="bg-white rounded-lg p-6 mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-4">
              {group.name}
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Budget per Gift</Text>
                <Text className="text-gray-900 font-semibold">
                  ${group.budget_limit_per_gift}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Members</Text>
                <Text className="text-gray-900 font-semibold">
                  {group.members?.length || 0}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-primary-500 rounded-lg py-3 mt-6"
              onPress={handleShare}
            >
              <Text className="text-white text-center font-semibold">
                Share Invite Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 rounded-lg py-3 mt-2"
              onPress={copyInviteCode}
            >
              <Text className="text-gray-700 text-center font-medium">
                View Invite Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Members List */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm font-medium mb-3">
              MEMBERS ({group.members?.length || 0})
            </Text>

            <View className="bg-white rounded-lg overflow-hidden">
              {group.members?.map((member, index) => (
                <View
                  key={member.users.id}
                  className={`p-4 flex-row items-center justify-between ${
                    index !== group.members.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium text-base">
                      {member.users.full_name}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {member.users.email}
                    </Text>
                    {member.users.birthday && (
                      <Text className="text-gray-400 text-xs mt-1">
                        🎂 Birthday: {new Date(member.users.birthday).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {member.role === 'admin' && (
                    <View className="bg-primary-100 px-3 py-1 rounded">
                      <Text className="text-primary-700 text-xs font-medium">
                        Admin
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
