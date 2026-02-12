import { useState, useEffect } from 'react';
import { Alert, ScrollView, ActivityIndicator, Platform, FlatList, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalizedFormat } from '@/hooks/useLocalizedFormat';
import {
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
  Heading,
  Box,
  Pressable,
} from '@gluestack-ui/themed';
import {
  getMyPublicDates,
  createPublicDate,
  updatePublicDate,
  deletePublicDate,
} from '@/lib/publicDates';
import type { PublicDate } from '@/lib/publicDates';
import { PublicDateCard } from '@/components/profile/PublicDateCard';
import { colors, spacing } from '@/constants/theme';

export default function PublicDatesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { format } = useLocalizedFormat();

  // Data state
  const [dates, setDates] = useState<PublicDate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingDate, setEditingDate] = useState<PublicDate | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [repeatAnnually, setRepeatAnnually] = useState(true);
  const [saving, setSaving] = useState(false);

  // DateTimePicker state (Android requires manual control)
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load dates on mount
  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
    try {
      const data = await getMyPublicDates();
      setDates(data);
    } catch (error) {
      console.error('Failed to load dates:', error);
      Alert.alert(t('alerts.titles.error'), t('calendar.publicDates.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedDate(new Date());
    setRepeatAnnually(true);
    setEditingDate(null);
    setShowForm(false);
  };

  const handleEdit = (date: PublicDate) => {
    setTitle(date.title);
    setDescription(date.description || '');
    // CRITICAL: Use month - 1 because Date constructor uses 0-indexed months
    setSelectedDate(new Date(2000, date.month - 1, date.day));
    setRepeatAnnually(date.year === null);
    setEditingDate(date);
    setShowForm(true);
  };

  const handleSave = async () => {
    // Prevent double-tap race condition
    if (saving) return;

    // Validate title
    if (!title.trim()) {
      Alert.alert(t('alerts.titles.required'), t('calendar.publicDates.enterTitle'));
      return;
    }

    setSaving(true);
    try {
      // Extract month/day from selectedDate
      const month = selectedDate.getMonth() + 1; // Convert 0-indexed to 1-indexed
      const day = selectedDate.getDate();
      const year = repeatAnnually ? null : selectedDate.getFullYear();

      if (editingDate) {
        // Update existing date
        await updatePublicDate(editingDate.id, {
          title,
          description: description || undefined,
          month,
          day,
          year,
        });
      } else {
        // Create new date
        await createPublicDate({
          title,
          description: description || undefined,
          month,
          day,
          year,
        });
      }

      // Reload dates and reset form
      await loadDates();
      resetForm();
      Alert.alert(t('common.success'), editingDate ? t('calendar.publicDates.dateUpdated') : t('calendar.publicDates.dateAdded'));
    } catch (error) {
      console.error('Failed to save date:', error);
      Alert.alert(t('alerts.titles.error'), t('calendar.publicDates.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, dateTitle: string) => {
    Alert.alert(
      t('calendar.publicDates.deleteDate'),
      t('calendar.publicDates.deleteConfirm', { title: dateTitle }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePublicDate(id);
              await loadDates();
              Alert.alert(t('calendar.publicDates.deleted'), t('calendar.publicDates.dateRemoved'));
            } catch (error) {
              console.error('Failed to delete date:', error);
              Alert.alert(t('alerts.titles.error'), t('calendar.publicDates.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    // Android requires manual dismiss
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="$backgroundLight50">
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </Box>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cream[50] }}
      contentContainerStyle={{ padding: spacing.md }}
    >
      <VStack space="md">
        {/* Header */}
        <HStack justifyContent="space-between" alignItems="center">
          <Heading size="lg" color="$burgundy800">
            {t('calendar.publicDates.title')}
          </Heading>
          <Button
            size="sm"
            onPress={() => setShowForm(!showForm)}
            backgroundColor={colors.burgundy[600]}
          >
            <HStack alignItems="center" space="xs">
              <MaterialCommunityIcons
                name={showForm ? 'close' : 'plus'}
                size={18}
                color="white"
              />
              <ButtonText>{showForm ? t('common.cancel') : t('common.add')}</ButtonText>
            </HStack>
          </Button>
        </HStack>

        {/* Form Section (inline, shown when showForm is true) */}
        {showForm && (
          <Box
            backgroundColor="$white"
            borderRadius="$lg"
            padding="$4"
            borderWidth={1}
            borderColor="$borderLight200"
          >
            <VStack space="md">
              <Text fontWeight="$semibold" fontSize="$md">
                {editingDate ? t('calendar.publicDates.editDate') : t('calendar.publicDates.addNewDate')}
              </Text>

              {/* Title Input (Required) */}
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">
                  {t('calendar.publicDates.titleRequired')}
                </Text>
                <Input variant="outline" size="lg">
                  <InputField
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('calendar.publicDates.titlePlaceholder')}
                  />
                </Input>
              </VStack>

              {/* Description Input (Optional) */}
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">
                  {t('calendar.publicDates.description')}
                </Text>
                <Input variant="outline" size="lg">
                  <InputField
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('calendar.publicDates.descriptionPlaceholder')}
                    multiline
                  />
                </Input>
              </VStack>

              {/* Date Picker */}
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">
                  {t('calendar.publicDates.date')}
                </Text>
                {Platform.OS === 'ios' ? (
                  // iOS: Inline DateTimePicker
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                  />
                ) : (
                  // Android: Pressable with modal picker
                  <>
                    <Pressable onPress={() => setShowDatePicker(true)}>
                      <Input variant="outline" size="lg" isReadOnly>
                        <InputField
                          value={format(selectedDate, 'PPP')}
                          editable={false}
                        />
                      </Input>
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                      />
                    )}
                  </>
                )}
              </VStack>

              {/* Repeat Annually Toggle */}
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontSize="$sm" fontWeight="$medium">
                    {t('calendar.publicDates.repeatAnnually')}
                  </Text>
                  <Text fontSize="$xs" color="$textLight500">
                    {t('calendar.publicDates.repeatAnnuallyHint')}
                  </Text>
                </VStack>
                <Switch
                  value={repeatAnnually}
                  onValueChange={setRepeatAnnually}
                  trackColor={{ false: '#D1D5DB', true: colors.burgundy[300] }}
                  thumbColor={repeatAnnually ? colors.burgundy[600] : '#F3F4F6'}
                />
              </HStack>

              {/* Form Buttons */}
              <HStack space="sm">
                <Button
                  flex={1}
                  variant="outline"
                  onPress={resetForm}
                  borderColor={colors.burgundy[600]}
                >
                  <ButtonText color={colors.burgundy[600]}>{t('common.cancel')}</ButtonText>
                </Button>
                <Button
                  flex={1}
                  onPress={handleSave}
                  isDisabled={saving || !title.trim()}
                  backgroundColor={colors.burgundy[600]}
                >
                  <ButtonText>{saving ? t('common.saving') : t('common.save')}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Dates List */}
        {dates.length === 0 ? (
          <Box
            backgroundColor="$white"
            borderRadius="$lg"
            padding="$6"
            alignItems="center"
          >
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={48}
              color={colors.cream[400]}
            />
            <Text fontSize="$md" color="$textLight500" marginTop="$2">
              {t('calendar.publicDates.noDatesYet')}
            </Text>
            {!showForm && (
              <Button
                size="sm"
                marginTop="$4"
                onPress={() => setShowForm(true)}
                backgroundColor={colors.burgundy[600]}
              >
                <ButtonText>{t('calendar.publicDates.addDate')}</ButtonText>
              </Button>
            )}
          </Box>
        ) : (
          <FlatList
            data={dates}
            renderItem={({ item, index }) => (
              <PublicDateCard
                date={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id, item.title)}
                index={index}
              />
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </VStack>
    </ScrollView>
  );
}
