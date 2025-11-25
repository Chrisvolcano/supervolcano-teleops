import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { fetchLocations, testFetchSpecificLocation, fetchLocationsViaREST, fetchAssignedLocationIds } from '../services/api';
import { getQueue, processQueue } from '../services/queue';
import { Location } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '../constants/Design';
import { useGamification } from '../contexts/GamificationContext';

export default function HomeScreen({ navigation }: any) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [assignedLocationIds, setAssignedLocationIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const gamification = useGamification();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // TODO: Get user ID from Firebase Auth when auth is implemented
    // For now, this will be empty and all locations will show
    // Once auth is added, fetch assigned locations here
    loadData();
  }, []);

  // Fetch assigned locations when userId is available
  useEffect(() => {
    if (userId) {
      fetchAssignedLocations();
    }
  }, [userId]);

  useEffect(() => {
    if (!loading && locations.length > 0) {
      // Animate entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, locations.length]);

  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressWidth, {
      toValue: gamification.getTodayProgress(),
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [gamification.todayCompleted]);

  async function fetchAssignedLocations() {
    if (!userId) return;
    
    try {
      console.log(`📍 Fetching assigned locations for user: ${userId}`);
      const locationIds = await fetchAssignedLocationIds(userId);
      setAssignedLocationIds(locationIds);
      console.log(`📍 User assigned to ${locationIds.length} locations`);
    } catch (error: any) {
      console.error('❌ Failed to fetch assigned locations:', error);
      // On error, show all locations (fail open)
      setAssignedLocationIds([]);
    }
  }

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
      
      // Filter to only assigned locations if assignments exist
      let filteredLocations = locs;
      if (assignedLocationIds.length > 0) {
        filteredLocations = locs.filter(loc => assignedLocationIds.includes(loc.id));
        console.log(`📍 Filtered to ${filteredLocations.length} assigned locations (from ${locs.length} total)`);
      } else {
        console.log('📍 No location assignments found - showing all locations');
      }
      
      setLocations(filteredLocations);
      
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

  // Reload locations when assignments change
  useEffect(() => {
    if (!loading && assignedLocationIds.length >= 0) {
      loadData();
    }
  }, [assignedLocationIds]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('JobSelect', { location: item });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
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
      <View style={styles.glassCard}>
        <BlurView intensity={80} tint="light" style={styles.glassBlur}>
          <LinearGradient
            colors={Gradients.glass}
            style={styles.glassGradient}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="flame" size={22} color={Colors.streak} />
                </View>
                <Text style={styles.statValue}>{gamification.streak}</Text>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="flash" size={22} color={Colors.xp} />
                </View>
                <Text style={styles.statValue}>{gamification.xp}</Text>
                <Text style={styles.statLabel}>XP earned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="trophy" size={22} color={Colors.gold} />
                </View>
                <Text style={styles.statValue}>L{gamification.level}</Text>
                <Text style={styles.statLabel}>level</Text>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </View>
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
        <View>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressSubtitle}>
            {gamification.todayCompleted >= 5 
              ? 'Goal achieved!' 
              : `${5 - gamification.todayCompleted} more to reach your goal`}
          </Text>
        </View>
        <Text style={styles.progressCount}>{gamification.todayCompleted}/5</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
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
              style={styles.progressGradient}
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );

  const LocationCard = ({ item, index }: { item: Location; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 80,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.locationCardContainer,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.locationCard}
          onPress={() => handleLocationPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.locationContent}>
            <View style={styles.locationIconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={24} color={Colors.primary} />
              </View>
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
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sparkles" size={40} color={Colors.primary} />
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.title}>My Locations</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.badgeText}>{locations.length}</Text>
          </View>
        </View>
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
                colors={Gradients.primary}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  title: {
    ...Typography.displayMedium,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
    ...Shadows.sm,
  },
  badgeText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  statsCardContainer: {
    marginBottom: Spacing.lg,
  },
  glassCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  glassBlur: {
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
  },
  glassGradient: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.glassBorder,
    marginHorizontal: Spacing.sm,
  },
  progressCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    ...Typography.headline,
    marginBottom: 2,
  },
  progressSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  progressCount: {
    ...Typography.headline,
    color: Colors.primary,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginTop: Spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  uploadBannerContainer: {
    marginBottom: Spacing.lg,
  },
  uploadBanner: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
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
    ...Typography.bodyLarge,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 2,
  },
  uploadBannerSubtitle: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  locationsSection: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  locationCardContainer: {
    marginBottom: Spacing.md,
  },
  locationCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadows.sm,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  locationIconContainer: {
    marginRight: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  locationAddress: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  chevronContainer: {
    marginLeft: Spacing.sm,
  },
});
