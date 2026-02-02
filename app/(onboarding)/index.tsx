import { useState } from 'react';
import { View, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  VStack,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
  Heading,
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Pressable,
} from '@gluestack-ui/themed';
import { supabase } from '@/lib/supabase';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';

export default function OnboardingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthday(selectedDate);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const path = await uploadAvatar(user.id);
      if (path) {
        setAvatarPath(path);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    }
  };

  const handleContinue = () => {
    // Validate required fields before showing confirmation
    if (!displayName.trim()) {
      Alert.alert('Required Field', 'Please enter your display name');
      return;
    }
    // Transition to confirmation step
    setStep('confirm');
  };

  const handleConfirmAndSave = async () => {
    try {
      setIsLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Could not get user information');
        setIsLoading(false);
        return;
      }

      // Update user profile with onboarding data
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName.trim(),
          birthday: birthday.toISOString().split('T')[0], // YYYY-MM-DD format
          avatar_url: avatarPath,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        Alert.alert('Error', 'Failed to save profile information');
        setIsLoading(false);
        return;
      }

      // Navigate to main app
      router.replace('/(app)/(tabs)/wishlist');
    } catch (error) {
      console.error('Error in onboarding:', error);
      Alert.alert('Error', 'Something went wrong');
      setIsLoading(false);
    }
  };

  const avatarUrl = avatarPath ? getAvatarUrl(avatarPath) : null;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      {/* Form Step */}
      {step === 'form' && (
        <VStack flex={1} padding="$6" justifyContent="center" space="xl">
          <VStack space="md" marginBottom="$8">
            <Heading size="2xl">Welcome!</Heading>
            <Text size="lg" color="$textLight600">
              Let's set up your profile to get started
            </Text>
          </VStack>

          {/* Avatar Upload */}
          <VStack space="md" alignItems="center" marginBottom="$6">
            <Pressable onPress={handleAvatarUpload}>
              <Avatar size="2xl" borderRadius="$full">
                {avatarUrl ? (
                  <AvatarImage source={{ uri: avatarUrl }} alt="Profile" />
                ) : (
                  <AvatarFallbackText>{displayName || 'Add Photo'}</AvatarFallbackText>
                )}
              </Avatar>
            </Pressable>
            <Button variant="link" onPress={handleAvatarUpload}>
              <ButtonText>
                {avatarPath ? 'Change Photo' : 'Add Profile Photo (Optional)'}
              </ButtonText>
            </Button>
          </VStack>

          {/* Display Name Input */}
          <VStack space="sm">
            <Text fontWeight="$medium">Display Name *</Text>
            <Input variant="outline" size="lg">
              <InputField
                placeholder="Enter your name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </Input>
          </VStack>

          {/* Birthday Picker */}
          <VStack space="sm">
            <Text fontWeight="$medium">Birthday *</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={birthday}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={{ backgroundColor: 'white' }}
              />
            ) : (
              <>
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <Input variant="outline" size="lg" isReadOnly>
                    <InputField
                      value={birthday.toLocaleDateString()}
                      editable={false}
                    />
                  </Input>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={birthday}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}
          </VStack>

          {/* Continue Button */}
          <Button
            size="lg"
            marginTop="$8"
            onPress={handleContinue}
            isDisabled={!displayName.trim()}
          >
            <ButtonText>Continue</ButtonText>
          </Button>
        </VStack>
      )}

      {/* Confirmation Step */}
      {step === 'confirm' && (
        <VStack flex={1} padding="$6" space="xl" justifyContent="center">
          <Heading size="2xl" textAlign="center">
            Confirm Your Birthday
          </Heading>

          <Text size="xl" textAlign="center" fontWeight="$semibold">
            {birthday.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>

          <View
            style={{
              backgroundColor: '#FEF3C7',
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#FCD34D',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#B45309" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', color: '#92400E', marginBottom: 4 }}>
                  Important Notice
                </Text>
                <Text style={{ color: '#92400E', fontSize: 14, lineHeight: 20 }}>
                  Your birthday cannot be changed after you complete setup.
                  This helps ensure fair birthday celebrations in your groups.
                </Text>
              </View>
            </View>
          </View>

          <VStack space="md" marginTop="$4">
            <Button size="lg" onPress={handleConfirmAndSave} isDisabled={isLoading}>
              <ButtonText>{isLoading ? 'Saving...' : 'Yes, This Is Correct'}</ButtonText>
            </Button>
            <Button variant="outline" size="lg" onPress={() => setStep('form')}>
              <ButtonText>Go Back and Edit</ButtonText>
            </Button>
          </VStack>
        </VStack>
      )}
    </ScrollView>
  );
}
