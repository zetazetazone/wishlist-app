import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signIn } from '../../utils/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('alerts.titles.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    const { error } = await signIn({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      const errorMessage = error instanceof Error ? error.message : t('common.errors.generic');
      Alert.alert(t('auth.loginFailed'), errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#fff' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
            {t('auth.welcomeBack')}
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>
            {t('auth.signInToAccount')}
          </Text>
        </View>

        {/* Form */}
        <View>
          {/* Email */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              {t('auth.email')}
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
              placeholder={t('auth.enterEmail')}
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              {t('auth.password')}
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
              placeholder={t('auth.enterPassword')}
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? '#93C5FD' : '#0EA5E9',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {t('auth.login')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>{t('auth.dontHaveAccount')} </Text>
            <Link href="/auth/signup" asChild>
              <TouchableOpacity>
                <Text style={{ color: '#0EA5E9', fontSize: 14, fontWeight: '600' }}>
                  {t('auth.signup')}
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
