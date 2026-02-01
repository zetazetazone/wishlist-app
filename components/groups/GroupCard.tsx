import { View, Text, TouchableOpacity } from 'react-native';
import { Group } from '../../types';

interface GroupCardProps {
  group: Group & { member_count?: number };
  onPress: () => void;
}

export default function GroupCard({ group, onPress }: GroupCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', flex: 1 }}>
          {group.name}
        </Text>
        <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ color: '#0369A1', fontSize: 12, fontWeight: '600' }}>
            {group.member_count || 0} members
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#6B7280', fontSize: 14 }}>
          Budget: ${group.budget_limit_per_gift} per gift
        </Text>
      </View>
    </TouchableOpacity>
  );
}
