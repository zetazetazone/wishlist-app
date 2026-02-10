import { useState, useEffect } from 'react';
import { Alert, ScrollView, ActivityIndicator, Platform, FlatList, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
      Alert.alert('Error', 'Failed to load dates');
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
    // Validate title
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
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
      Alert.alert('Success', editingDate ? 'Date updated' : 'Date added');
    } catch (error) {
      console.error('Failed to save date:', error);
      Alert.alert('Error', 'Failed to save date');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Date',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePublicDate(id);
              await loadDates();
              Alert.alert('Deleted', 'Date removed');
            } catch (error) {
              console.error('Failed to delete date:', error);
              Alert.alert('Error', 'Failed to delete date');
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
            Important Dates
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
              <ButtonText>{showForm ? 'Cancel' : 'Add'}</ButtonText>
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
                {editingDate ? 'Edit Date' : 'Add New Date'}
              </Text>

              {/* Title Input (Required) */}
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">
                  Title *
                </Text>
                <Input variant="outline" size="lg">
                  <InputField
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Wedding Anniversary"
                  />
                </Input>
              </VStack>

              {/* Description Input (Optional) */}
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">
                  Description
                </Text>
                <Input variant="outline" size="lg">
                  <InputField
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Optional notes"
                    multiline
                  />
                </Input>
              </VStack>

              {/* Date Picker */}
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">
                  Date
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
                          value={format(selectedDate, 'MMMM d, yyyy')}
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
                    Repeat annually
                  </Text>
                  <Text fontSize="$xs" color="$textLight500">
                    Turn off to save the year
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
                  <ButtonText color={colors.burgundy[600]}>Cancel</ButtonText>
                </Button>
                <Button
                  flex={1}
                  onPress={handleSave}
                  isDisabled={saving || !title.trim()}
                  backgroundColor={colors.burgundy[600]}
                >
                  <ButtonText>{saving ? 'Saving...' : 'Save'}</ButtonText>
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
              No dates added yet
            </Text>
            {!showForm && (
              <Button
                size="sm"
                marginTop="$4"
                onPress={() => setShowForm(true)}
                backgroundColor={colors.burgundy[600]}
              >
                <ButtonText>Add Date</ButtonText>
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
