/**
 * ExternalLinksSection Component
 *
 * Form section for external wishlist links (Amazon, Pinterest, etc.).
 * Includes add link modal with URL validation.
 *
 * Used in personal details form (PROF-05).
 */

import React, { useState } from 'react';
import { StyleSheet, Text, Modal, Linking, Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  VStack,
  HStack,
  Heading,
  Button,
  ButtonText,
  Input,
  InputField,
  Pressable,
} from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ExternalLink } from '../../types/database.types';
import { ExternalLinkRow } from './ExternalLinkRow';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface ExternalLinksSectionProps {
  links: ExternalLink[];
  onChange: (links: ExternalLink[]) => void;
}

export function ExternalLinksSection({ links, onChange }: ExternalLinksSectionProps) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [urlError, setUrlError] = useState('');

  /**
   * Validate URL format (must be http or https).
   */
  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setUrlError('');
      return false;
    }
    try {
      const urlObj = new URL(input);
      const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      setUrlError(isValid ? '' : t('profile.personalDetails.urlErrorProtocol'));
      return isValid;
    } catch {
      setUrlError(t('profile.personalDetails.urlErrorInvalid'));
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    validateUrl(value);
  };

  const handleAdd = () => {
    if (!validateUrl(urlInput)) return;

    const newLink: ExternalLink = {
      url: urlInput.trim(),
      label: labelInput.trim() || undefined,
    };

    onChange([...links, newLink]);
    closeModal();
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const handleOpen = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('profile.personalDetails.cannotOpenLink'));
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert(t('common.error'), t('profile.personalDetails.failedOpenLink'));
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setUrlInput('');
    setLabelInput('');
    setUrlError('');
  };

  const isAddDisabled = !urlInput.trim() || !!urlError;

  return (
    <VStack space="md" style={styles.section}>
      <VStack space="xs">
        <Heading size="sm">{t('profile.personalDetails.externalWishlists')}</Heading>
        <Text style={styles.helperText}>
          {t('profile.personalDetails.externalWishlistsHelper')}
        </Text>
      </VStack>

      {/* Link List */}
      {links.length > 0 && (
        <VStack>
          {links.map((link, index) => (
            <ExternalLinkRow
              key={`${link.url}-${index}`}
              link={link}
              onRemove={() => handleRemove(index)}
              onOpen={() => handleOpen(link.url)}
            />
          ))}
        </VStack>
      )}

      {/* Add Link Button */}
      <Button
        variant="outline"
        size="sm"
        onPress={() => setModalVisible(true)}
      >
        <HStack space="xs" alignItems="center">
          <MaterialCommunityIcons
            name="plus"
            size={16}
            color={colors.burgundy[600]}
          />
          <ButtonText>{t('profile.personalDetails.addLink')}</ButtonText>
        </HStack>
      </Button>

      {/* Add Link Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <VStack space="md">
              <Heading size="md">{t('profile.personalDetails.addExternalWishlist')}</Heading>

              {/* URL Input */}
              <VStack space="xs">
                <Text style={styles.label}>{t('profile.personalDetails.urlRequired')}</Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder={t('profile.personalDetails.urlPlaceholder')}
                    value={urlInput}
                    onChangeText={handleUrlChange}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </Input>
                {urlError ? (
                  <Text style={styles.errorText}>{urlError}</Text>
                ) : null}
              </VStack>

              {/* Label Input */}
              <VStack space="xs">
                <Text style={styles.label}>{t('profile.personalDetails.labelOptional')}</Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder={t('profile.personalDetails.labelPlaceholder')}
                    value={labelInput}
                    onChangeText={setLabelInput}
                  />
                </Input>
              </VStack>

              {/* Action Buttons */}
              <HStack space="md" justifyContent="flex-end" marginTop="$2">
                <Button variant="outline" onPress={closeModal}>
                  <ButtonText>{t('common.cancel')}</ButtonText>
                </Button>
                <Button onPress={handleAdd} isDisabled={isAddDisabled}>
                  <ButtonText>{t('profile.personalDetails.addLink')}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>
    </VStack>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
  },
  helperText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
});
