import { View, Text, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Upcoming Events
        </Text>
        <View className="bg-gray-100 rounded-lg p-4">
          <Text className="text-gray-600 text-center">
            No upcoming events yet
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
