/**
 * AddNoteSheet Component
 *
 * Bottom sheet modal for creating a new secret note about a member.
 * Includes character counter and validation.
 *
 * Uses @gorhom/bottom-sheet's built-in keyboard handling with
 * dynamic sizing for optimal layout.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface AddNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  memberName: string; // For display: "Add note about {memberName}"
}

const MAX_CHARS = 280;

/**
 * AddNoteSheet provides note creation UI with character limit validation.
 */
export function AddNoteSheet({
  isOpen,
  onClose,
  onSubmit,
  memberName,
}: AddNoteSheetProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const charsRemaining = MAX_CHARS - content.length;
  const isOverLimit = charsRemaining < 0;
  const isNearLimit = charsRemaining <= 20 && charsRemaining >= 0;
  const isValid = content.trim().length > 0 && !isOverLimit;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle sheet open/close
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen]);

  const handleContentChange = (text: string) => {
    // Allow slight overflow to show error state
    if (text.length <= MAX_CHARS + 50) {
      setContent(text);
    }
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length > MAX_CHARS) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedContent);
      setContent('');
      onClose();
    } catch (error) {
      // Error handling done by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Add Note</Text>
            <Text style={styles.subtitle}>About {memberName}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={colors.cream[600]}
            />
          </Pressable>
        </View>

        {/* Content Input - Using BottomSheetTextInput for proper keyboard handling */}
        <View style={styles.inputSection}>
          <BottomSheetTextInput
            style={styles.input}
            value={content}
            onChangeText={handleContentChange}
            placeholder="What would help others pick the perfect gift?"
            placeholderTextColor={colors.cream[400]}
            multiline
            autoFocus
            editable={!isSubmitting}
            textAlignVertical="top"
          />
          <View style={styles.inputFooter}>
            <Text
              style={[
                styles.charCounter,
                isNearLimit && styles.charCounterWarning,
                isOverLimit && styles.charCounterError,
              ]}
            >
              {charsRemaining}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            (!isValid || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="note-plus"
                size={18}
                color={colors.white}
              />
              <Text style={styles.submitButtonText}>Add Note</Text>
            </>
          )}
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.burgundy[800],
  },
  subtitle: {
    fontSize: 14,
    color: colors.cream[600],
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  inputSection: {
    paddingVertical: spacing.md,
  },
  input: {
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
    color: colors.cream[800],
    backgroundColor: colors.cream[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cream[200],
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  charCounter: {
    fontSize: 13,
    color: colors.cream[600],
  },
  charCounterWarning: {
    color: colors.warning,
  },
  charCounterError: {
    color: colors.error,
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.burgundy[700],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.cream[300],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default AddNoteSheet;
