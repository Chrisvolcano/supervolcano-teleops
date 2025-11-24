import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { fetchLocations, testFetchSpecificLocation, fetchLocationsViaREST } from '../services/api';
import { getQueue, processQueue } from '../services/queue';
import { Location } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '../constants/Design';
import { useGamification } from '../contexts/GamificationContext';

export default function HomeScreen({ navigation }: any) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState(0);
  const gamification = useGamification();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && locations.length > 0) {
      // Animate entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, locations.length]);

  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressWidth, {
      toValue: gamification.getTodayProgress(),
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [gamification.todayCompleted]);

  async function loadData() {
    try {
      setLoading(true);
      
      console.log('🔍 DEBUG: Starting loadData...');
      console.log('🔍 Firebase Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
      console.log('🔍 API Base URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
      
      try {
        console.log('🧪 Running specific document test...');
        const testLocationId = 'bd577ffe-d733-4002-abb8-9ea047c0f326';
        const testResult = await testFetchSpecificLocation(testLocationId);
        console.log('🧪 Test result:', testResult ? 'SUCCESS - Document found!' : 'FAILED - Document not found');
        if (testResult) {
          console.log('🧪 Test document data:', testResult);
        }
      } catch (testError: any) {
        console.error('🧪 Test error:', testError);
      }
      
      console.log('🔍 Fetching all locations...');
      let locs = await fetchLocations();
      console.log('🔍 Locations fetched:', locs.length);
      
      if (locs.length === 0) {
        console.warn('⚠️ SDK returned 0 locations, trying REST API fallback...');
        try {
          locs = await fetchLocationsViaREST();
          console.log('🌐 REST API returned:', locs.length, 'locations');
        } catch (restError) {
          console.error('🌐 REST API also failed:', restError);
        }
      }
      
      setLocations(locs);
      
      const queue = await getQueue();
      const pending = queue.filter(item => item.status === 'pending' || item.status === 'error').length;
      setPendingUploads(pending);
      
      console.log('✅ Load data complete');
    } catch (error: any) {
      console.error('❌ Load data failed:', error);
      Alert.alert('Error', 'Failed to load locations: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessUploads() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('🔄 User tapped upload banner - starting queue processing...');
      
      await processQueue((item, progress) => {
        console.log(`📊 Uploading ${item.jobTitle}: ${progress.toFixed(0)}%`);
      });
      
      console.log('✅ Queue processing complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'All videos uploaded successfully!');
      loadData();
    } catch (error: any) {
      console.error('❌ Queue processing failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Upload failed: ${error.message || 'Unknown error'}. Check the console for details.`);
    }
  }

  const handleLocationPress = (item: Location) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('JobSelect', { location: item });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const renderStatsCard = () => (
    <Animated.View 
      style={[
        styles.statsCardContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={Gradients.mesh}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <BlurView intensity={20} tint="light" style={styles.statsBlur}>
          {/* Streak */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={24} color={Colors.streak} />
            </View>
            <Text style={styles.statValue}>{gamification.streak}</Text>
            <Text style={styles.statLabel}>day streak</Text>
          </View>

          {/* Divider */}
          <View style={styles.statDivider} />

          {/* XP */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flash" size={24} color={Colors.xp} />
            </View>
            <Text style={styles.statValue}>{gamification.xp}</Text>
            <Text style={styles.statLabel}>XP earned</Text>
          </View>

          {/* Divider */}
          <View style={styles.statDivider} />

          {/* Level */}
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.statValue}>L{gamification.level}</Text>
            <Text style={styles.statLabel}>level</Text>
          </View>
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );

  const renderProgressCard = () => (
    <Animated.View 
      style={[
        styles.progressCard,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Today's Progress</Text>
        <Text style={styles.progressCount}>{gamification.todayCompleted}/5</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFillContainer,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressBarFill}
            />
          </Animated.View>
        </View>
      </View>
      
      <Text style={styles.progressSubtitle}>
        {gamification.todayCompleted >= 5 
          ? '🎉 Goal achieved!' 
          : `${5 - gamification.todayCompleted} more to reach your goal`}
      </Text>
    </Animated.View>
  );

  const LocationCard = ({ item, index }: { item: Location; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          { marginTop: index === 0 ? 0 : Spacing.md },
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.locationCard}
          onPress={() => handleLocationPress(item)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="location" size={28} color="white" />
                </LinearGradient>
              </View>
              
              <View style={styles.locationInfo}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.address && (
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                )}
              </View>
              
              <View style={styles.chevronContainer}>
                <View style={styles.chevronBg}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }, []);

    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sparkles" size={48} color={Colors.primary} />
          </Animated.View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Animated header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ scale: headerScale }],
          }
        ]}
      >
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.title}>My Locations</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="location" size={16} color="white" />
              <Text style={styles.badgeText}>{locations.length}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Stats card */}
        {renderStatsCard()}
        
        {/* Progress card */}
        {renderProgressCard()}

        {/* Pending Uploads Banner */}
        {pendingUploads > 0 && (
          <Animated.View
            style={[
              styles.uploadBannerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <TouchableOpacity
              style={styles.uploadBanner}
              onPress={handleProcessUploads}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={Gradients.success}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.uploadBannerGradient}
              >
                <Ionicons name="cloud-upload" size={24} color="#fff" />
                <View style={styles.uploadBannerText}>
                  <Text style={styles.uploadBannerTitle}>
                    {pendingUploads} video{pendingUploads > 1 ? 's' : ''} ready to upload
                  </Text>
                  <Text style={styles.uploadBannerSubtitle}>Tap to upload now</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Locations */}
        <View style={styles.locationsSection}>
          <Text style={styles.sectionTitle}>Your Locations</Text>
          {locations.map((item, index) => (
            <LocationCard key={item.id} item={item} index={index} />
          ))}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  headerGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.displayMedium,
    color: '#fff',
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.labelLarge,
    color: 'white',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  statsCardContainer: {
    marginBottom: Spacing.lg,
  },
  statsCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  statsBlur: {
    flexDirection: 'row',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.displaySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: Spacing.md,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    ...Shadows.medium,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  progressCount: {
    ...Typography.titleMedium,
    color: Colors.primary,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: Spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFillContainer: {
    height: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  uploadBannerContainer: {
    marginBottom: Spacing.lg,
  },
  uploadBanner: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  uploadBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  uploadBannerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  uploadBannerTitle: {
    ...Typography.titleSmall,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  uploadBannerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  locationsSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  locationCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  cardGradient: {
    borderRadius: BorderRadius.xl,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  locationAddress: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  chevronContainer: {
    marginLeft: Spacing.sm,
  },
  chevronBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
