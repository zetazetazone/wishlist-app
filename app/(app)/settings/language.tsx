import { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  VStack,
  HStack,
  Text,
  Box,
} from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { SupportedLanguage } from '@/lib/language';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface LanguageOption {
  code: SupportedLanguage;
  nativeName: string;
  englishName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
];

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { currentLanguage, changeLanguage, isLoading } = useLanguage(userId);

  // Load user ID on mount
  useEffect(() => {
    const loadUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    loadUserId();
  }, []);

  const handleLanguageSelect = async (lang: LanguageOption) => {
    if (lang.code === currentLanguage || isLoading) {
      return; // No-op if same language or currently loading
    }
    try {
      await changeLanguage(lang.code);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings.language'),
        }}
      />
      <Box flex={1} backgroundColor={colors.cream[50]} padding={spacing.lg}>
        <VStack space="md">
          {/* Description */}
          <Text
            fontSize="$sm"
            color={colors.cream[600]}
            marginBottom={spacing.md}
          >
            {t('settings.languageDescription')}
          </Text>

          {/* Language Options */}
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageSelect(lang)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Box
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    isLoading && styles.cardDisabled,
                  ]}
                >
                  <HStack
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    {/* Radio button */}
                    <HStack alignItems="center" space="md">
                      <Box style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <Box style={styles.radioFill} />}
                      </Box>
                      <VStack>
                        <Text
                          fontWeight="$semibold"
                          fontSize="$md"
                          color={colors.burgundy[900]}
                        >
                          {lang.nativeName}
                        </Text>
                        <Text
                          fontSize="$sm"
                          color={colors.cream[600]}
                        >
                          {lang.englishName}
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Check icon or loading indicator */}
                    {isLoading && lang.code !== currentLanguage ? null : (
                      isSelected && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={24}
                          color={colors.burgundy[600]}
                        />
                      )
                    )}
                    {isLoading && lang.code !== currentLanguage && lang.code === currentLanguage && (
                      <ActivityIndicator size="small" color={colors.burgundy[600]} />
                    )}
                  </HStack>
                </Box>
              </TouchableOpacity>
            );
          })}

          {/* Loading overlay for language change */}
          {isLoading && (
            <HStack
              justifyContent="center"
              alignItems="center"
              marginTop={spacing.md}
            >
              <ActivityIndicator size="small" color={colors.burgundy[600]} />
              <Text
                marginLeft={spacing.sm}
                color={colors.cream[600]}
                fontSize="$sm"
              >
                {t('common.loading')}
              </Text>
            </HStack>
          )}
        </VStack>
      </Box>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cream[300],
  },
  cardSelected: {
    borderColor: colors.burgundy[400],
    backgroundColor: colors.burgundy[50],
  },
  cardDisabled: {
    opacity: 0.6,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.burgundy[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.burgundy[600],
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.burgundy[600],
  },
});
