import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { updateGroupBudget } from '../../utils/groups';
import { colors, spacing, borderRadius } from '../../constants/theme';

type BudgetApproach = 'per_gift' | 'monthly' | 'yearly';

interface BudgetSettingsSectionProps {
  currentApproach: BudgetApproach | null;
  currentAmount: number | null; // in cents from DB
  groupId: string;
  onBudgetUpdated: (approach: string | null, amount: number | null) => void;
}

interface ApproachOption {
  key: BudgetApproach;
  titleKey: string;
  descriptionKey: string;
  icon: 'gift-outline' | 'calendar-month' | 'calendar-clock';
  placeholder: string;
  helperTextKey: string;
}

const APPROACH_OPTIONS: ApproachOption[] = [
  {
    key: 'per_gift',
    titleKey: 'groups.budgetSection.perGift',
    descriptionKey: 'groups.budgetSection.perGiftSettingsDesc',
    icon: 'gift-outline',
    placeholder: '50',
    helperTextKey: 'groups.budgetSection.perGiftHelper',
  },
  {
    key: 'monthly',
    titleKey: 'groups.budgetSection.monthly',
    descriptionKey: 'groups.budgetSection.monthlyDescription',
    icon: 'calendar-month',
    placeholder: '100',
    helperTextKey: 'groups.budgetSection.monthlyHelper',
  },
  {
    key: 'yearly',
    titleKey: 'groups.budgetSection.yearly',
    descriptionKey: 'groups.budgetSection.yearlyDescription',
    icon: 'calendar-clock',
    placeholder: '500',
    helperTextKey: 'groups.budgetSection.yearlyHelper',
  },
];

export function BudgetSettingsSection({
  currentApproach,
  currentAmount,
  groupId,
  onBudgetUpdated,
}: BudgetSettingsSectionProps) {
  const { t } = useTranslation();
  const [selectedApproach, setSelectedApproach] = useState<BudgetApproach | null>(
    currentApproach
  );
  const [amountText, setAmountText] = useState(
    currentAmount != null ? (currentAmount / 100).toString() : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Determine if there are unsaved changes
  const currentAmountText = currentAmount != null ? (currentAmount / 100).toString() : '';
  const hasChanges =
    selectedApproach !== currentApproach || amountText !== currentAmountText;

  const selectedOption = APPROACH_OPTIONS.find((o) => o.key === selectedApproach);

  const handleApproachTap = (approach: BudgetApproach) => {
    if (approach === selectedApproach) {
      // Deselecting - confirm removal
      Alert.alert(
        t('groups.budgetSection.removeBudgetTitle'),
        t('groups.budgetSection.removeBudgetMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: () => {
              setSelectedApproach(null);
              setAmountText('');
            },
          },
        ]
      );
    } else if (selectedApproach != null) {
      // Switching approach - confirm change
      Alert.alert(
        t('groups.budgetSection.changeApproachTitle'),
        t('groups.budgetSection.changeApproachMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.change'),
            style: 'default',
            onPress: () => {
              setSelectedApproach(approach);
            },
          },
        ]
      );
    } else {
      // First selection - no confirmation needed
      setSelectedApproach(approach);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Convert dollars to cents (all approaches can store an amount)
    const amountCents =
      selectedApproach && amountText.trim()
        ? Math.round(parseFloat(amountText) * 100)
        : null;

    // Validate amount if provided
    if (amountText.trim() && (isNaN(parseFloat(amountText)) || parseFloat(amountText) < 0)) {
      Alert.alert(t('groups.budgetSection.invalidAmountTitle'), t('groups.budgetSection.invalidAmountMessage'));
      setIsSaving(false);
      return;
    }

    try {
      const { error } = await updateGroupBudget(groupId, {
        approach: selectedApproach,
        amount: amountCents,
      });

      if (error) throw error;

      Alert.alert(t('common.saved'), t('groups.budgetSection.settingsUpdated'));
      onBudgetUpdated(selectedApproach, amountCents);
    } catch (error) {
      console.error('Error saving budget settings:', error);
      Alert.alert(t('alerts.titles.error'), t('groups.budgetSection.failedToUpdate'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      {/* Approach Cards */}
      {APPROACH_OPTIONS.map((option) => {
        const isActive = selectedApproach === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              budgetStyles.approachCard,
              isActive
                ? budgetStyles.approachCardActive
                : budgetStyles.approachCardInactive,
            ]}
            onPress={() => handleApproachTap(option.key)}
            activeOpacity={0.7}
          >
            <View style={budgetStyles.approachCardIcon}>
              <MaterialCommunityIcons
                name={option.icon}
                size={24}
                color={isActive ? colors.success : colors.cream[500]}
              />
            </View>
            <View style={budgetStyles.approachCardContent}>
              <Text
                style={[
                  budgetStyles.approachCardTitle,
                  isActive && budgetStyles.approachCardTitleActive,
                ]}
              >
                {t(option.titleKey)}
              </Text>
              <Text style={budgetStyles.approachCardDescription}>
                {t(option.descriptionKey)}
              </Text>
            </View>
            <View
              style={[
                budgetStyles.radioOuter,
                isActive && budgetStyles.radioOuterActive,
              ]}
            >
              {isActive && <View style={budgetStyles.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Amount Input - shown when approach selected */}
      {selectedApproach && selectedOption && (
        <View style={budgetStyles.amountSection}>
          <Text style={budgetStyles.fieldLabel}>{t('groups.budgetSection.budgetAmount')}</Text>
          <View style={budgetStyles.amountInputRow}>
            <Text style={budgetStyles.dollarPrefix}>$</Text>
            <TextInput
              style={budgetStyles.amountInput}
              value={amountText}
              onChangeText={setAmountText}
              placeholder={selectedOption.placeholder}
              placeholderTextColor={colors.cream[500]}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={budgetStyles.helperText}>{t(selectedOption.helperTextKey)}</Text>
        </View>
      )}

      {/* Save Button - shown when changes exist */}
      {hasChanges && (
        <TouchableOpacity
          style={[
            budgetStyles.saveButton,
            isSaving && budgetStyles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={budgetStyles.saveButtonText}>{t('groups.budgetSection.saveSettings')}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const budgetStyles = StyleSheet.create({
  approachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  approachCardActive: {
    backgroundColor: colors.success + '1A', // 10% opacity green
    borderColor: colors.success,
  },
  approachCardInactive: {
    backgroundColor: colors.white,
    borderColor: colors.cream[300],
  },
  approachCardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cream[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  approachCardContent: {
    flex: 1,
  },
  approachCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 2,
  },
  approachCardTitleActive: {
    color: colors.success,
  },
  approachCardDescription: {
    fontSize: 12,
    color: colors.cream[600],
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.cream[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioOuterActive: {
    borderColor: colors.success,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  amountSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cream[700],
    marginBottom: spacing.xs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cream[400],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  dollarPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cream[600],
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.black,
  },
  helperText: {
    fontSize: 12,
    color: colors.cream[600],
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
