import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '700',
                  color: colors.white,
                  marginBottom: spacing.xs,
                }}
              >
                Welcome
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.gold[200],
                  fontWeight: '400',
                }}
              >
                Manage your wishlists and groups
              </Text>
            </View>
          </MotiView>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.md,
              }}
            >
              Quick Actions
            </Text>

            <View style={{ gap: spacing.md }}>
              {/* My Wishlist Card */}
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 100 }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    borderWidth: 2,
                    borderColor: colors.gold[200],
                    ...shadows.md,
                  }}
                  activeOpacity={0.7}
                  onPress={() => router.push('/wishlist' as any)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: colors.burgundy[50],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="gift"
                        size={28}
                        color={colors.burgundy[700]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '700',
                          color: colors.burgundy[800],
                          marginBottom: spacing.xs / 2,
                        }}
                      >
                        My Wishlist
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.burgundy[400],
                        }}
                      >
                        View and manage your gifts
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.burgundy[400]}
                    />
                  </View>
                </TouchableOpacity>
              </MotiView>

              {/* My Groups Card */}
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 200 }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    borderWidth: 2,
                    borderColor: colors.gold[200],
                    ...shadows.md,
                  }}
                  activeOpacity={0.7}
                  onPress={() => router.push('/groups' as any)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: colors.gold[50],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="account-group"
                        size={28}
                        color={colors.gold[700]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '700',
                          color: colors.burgundy[800],
                          marginBottom: spacing.xs / 2,
                        }}
                      >
                        My Groups
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.burgundy[400],
                        }}
                      >
                        Manage gift exchange groups
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.burgundy[400]}
                    />
                  </View>
                </TouchableOpacity>
              </MotiView>
            </View>
          </View>

          {/* Upcoming Events */}
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.md,
              }}
            >
              Upcoming Events
            </Text>

            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 300 }}
            >
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xl,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: colors.gold[100],
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: colors.burgundy[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.md,
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-blank"
                    size={40}
                    color={colors.burgundy[400]}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: colors.burgundy[800],
                    marginBottom: spacing.xs,
                    textAlign: 'center',
                  }}
                >
                  No Upcoming Events
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: colors.burgundy[400],
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  Events from your groups will{'\n'}appear here
                </Text>
              </View>
            </MotiView>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
