import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { joinGroup } from '../../utils/groups';

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinGroupModal({ visible, onClose, onSuccess }: JoinGroupModalProps) {
  const { t } = useTranslation();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert(t('alerts.titles.error'), t('groups.form.enterInviteCode'));
      return;
    }

    setLoading(true);
    const { data, error } = await joinGroup(inviteCode.trim());
    setLoading(false);

    if (error) {
      const errorMessage = error instanceof Error ? error.message : t('groups.form.failedToJoin');
      Alert.alert(t('alerts.titles.error'), errorMessage);
      return;
    }

    // Reset form
    setInviteCode('');

    Alert.alert(t('common.success'), t('groups.form.joinedSuccess', { name: data?.name }));
    onSuccess();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Content */}
        <View
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              {t('groups.joinGroup')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 28, color: '#6B7280' }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Invite Code */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              {t('groups.inviteCode')}
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 18,
                color: '#111827',
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                textAlign: 'center',
                letterSpacing: 2,
              }}
              placeholder={t('groups.form.inviteCodePlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              editable={!loading}
            />
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
              {t('groups.form.inviteCodeHint')}
            </Text>
          </View>

          {/* Join Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? '#93C5FD' : '#0EA5E9',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
            }}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {t('groups.joinGroup')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
