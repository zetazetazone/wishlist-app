import { useState, useEffect } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createGroup } from '../../utils/groups';
import { uploadGroupPhotoFromUri } from '../../lib/storage';
import { GroupAvatar } from './GroupAvatar';
import { supabase } from '../../lib/supabase';

const MAX_DESCRIPTION = 500;

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateGroupModal({ visible, onClose, onSuccess }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [mode, setMode] = useState<'greetings' | 'gifts'>('gifts');
  const [budgetApproach, setBudgetApproach] = useState<'per_gift' | 'monthly' | 'yearly' | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear budget fields when switching to greetings mode
  useEffect(() => {
    if (mode === 'greetings') {
      setBudgetApproach(null);
      setBudgetAmount('');
    }
  }, [mode]);

  const handlePhotoUpload = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to add a group photo.');
      return;
    }

    // Launch image picker with 16:9 aspect for group headers
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);

    // Create group first (without photo)
    const { data: group, error } = await createGroup({
      name: name.trim(),
      description: description.trim() || null,
      mode: 'gifts',
      budget_approach: null,
      budget_amount: null,
    });

    if (error || !group) {
      setLoading(false);
      console.error('Create group error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to create group. Please try again.';
      Alert.alert('Error', errorMessage);
      return;
    }

    // Upload photo if selected
    if (photoUri) {
      try {
        const path = await uploadGroupPhotoFromUri(photoUri, group.id);
        if (path) {
          // Update group with photo path
          await supabase
            .from('groups')
            .update({ photo_url: path })
            .eq('id', group.id);
        }
      } catch (photoError) {
        console.error('Photo upload error:', photoError);
        // Non-blocking - group was created successfully
      }
    }

    setLoading(false);

    // Reset form
    setName('');
    setDescription('');
    setPhotoUri(null);

    Alert.alert('Success!', `Group "${name}" created successfully`);
    onSuccess();
    onClose();
  };

  const handleClose = () => {
    // Reset form on close
    setName('');
    setDescription('');
    setPhotoUri(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
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
          onPress={handleClose}
        />

        {/* Modal Content */}
        <View
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
            maxHeight: '85%',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Create Group
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ fontSize: 28, color: '#6B7280' }}>x</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Photo Upload Section */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity onPress={handlePhotoUpload} disabled={loading}>
                {photoUri ? (
                  <View style={{
                    width: 160,
                    height: 90,  // 16:9 aspect
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#E5E7EB',
                  }}>
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <GroupAvatar
                    group={{ name: name || 'New Group', photo_url: null }}
                    size="xl"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePhotoUpload} disabled={loading}>
                <Text style={{ color: '#0EA5E9', marginTop: 8, fontSize: 14 }}>
                  {photoUri ? 'Change Photo' : 'Add Photo (Optional)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Group Name */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Group Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#111827',
                }}
                placeholder="Friends & Family"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                editable={!loading}
                maxLength={50}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Description (Optional)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#111827',
                  minHeight: 100,
                  textAlignVertical: 'top',
                }}
                placeholder="What's this group about?"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={MAX_DESCRIPTION}
                editable={!loading}
              />
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {description.length} / {MAX_DESCRIPTION} characters
              </Text>
            </View>

            {/* Mode Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                Group Mode
              </Text>

              {/* Gifts Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  backgroundColor: mode === 'gifts' ? '#EFF6FF' : '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: mode === 'gifts' ? '#3B82F6' : 'transparent',
                  marginBottom: 8,
                }}
                onPress={() => setMode('gifts')}
                disabled={loading}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: mode === 'gifts' ? '#3B82F6' : '#9CA3AF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  marginTop: 2,
                }}>
                  {mode === 'gifts' && (
                    <View style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#3B82F6',
                    }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    Gifts
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                    Coordinate gifts with budget tracking and wishlists
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Greetings Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  backgroundColor: mode === 'greetings' ? '#EFF6FF' : '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: mode === 'greetings' ? '#3B82F6' : 'transparent',
                }}
                onPress={() => setMode('greetings')}
                disabled={loading}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: mode === 'greetings' ? '#3B82F6' : '#9CA3AF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  marginTop: 2,
                }}>
                  {mode === 'greetings' && (
                    <View style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#3B82F6',
                    }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    Greetings Only
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                    Collect digital birthday greetings without gifts
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={{
                backgroundColor: loading ? '#93C5FD' : '#0EA5E9',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 20,
              }}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Create Group
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
