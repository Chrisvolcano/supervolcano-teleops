import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchLocations, testFetchSpecificLocation, fetchLocationsViaREST } from '../services/api';
import { getQueue, processQueue } from '../services/queue';
import { testFirebaseStorage } from '../services/testUpload';
import { Location } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Design';

export default function HomeScreen({ navigation }: any) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      console.log('🔍 DEBUG: Starting loadData...');
      console.log('🔍 Firebase Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
      console.log('🔍 API Base URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
      
      // TEST: Try to fetch a specific location by ID
      // Replace with one of your actual location IDs from Firebase Console
      // You can find this in Firebase Console → Firestore → locations → click a document
      try {
        console.log('🧪 Running specific document test...');
        const testLocationId = 'bd577ffe-d733-4002-abb8-9ea047c0f326'; // Real location ID from Firebase Console
        const testResult = await testFetchSpecificLocation(testLocationId);
        console.log('🧪 Test result:', testResult ? 'SUCCESS - Document found!' : 'FAILED - Document not found');
        if (testResult) {
          console.log('🧪 Test document data:', testResult);
        }
      } catch (testError: any) {
        console.error('🧪 Test error:', testError);
        console.error('🧪 Test error code:', testError.code);
        console.error('🧪 Test error message:', testError.message);
      }
      
      console.log('🔍 Fetching all locations...');
      let locs = await fetchLocations();
      console.log('🔍 Locations fetched:', locs.length);
      
      // If SDK returns 0, try REST API as fallback
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
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      Alert.alert('Error', 'Failed to load locations: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessUploads() {
    try {
      console.log('🔄 User tapped upload banner - starting queue processing...');
      
      // Optional: Test Firebase Storage first (uncomment to enable)
      // try {
      //   console.log('🧪 Testing Firebase Storage connection...');
      //   await testFirebaseStorage();
      //   console.log('✅ Storage test passed');
      // } catch (testError) {
      //   console.error('❌ Storage test failed:', testError);
      //   Alert.alert('Storage Error', 'Cannot connect to Firebase Storage. Check your internet connection and Firebase rules.');
      //   return;
      // }
      
      await processQueue((item, progress) => {
        console.log(`📊 Uploading ${item.jobTitle}: ${progress.toFixed(0)}%`);
      });
      
      console.log('✅ Queue processing complete');
      Alert.alert('Success', 'All videos uploaded successfully!');
      loadData();
    } catch (error: any) {
      console.error('❌ Queue processing failed:', error);
      Alert.alert('Error', `Upload failed: ${error.message || 'Unknown error'}. Check the console for details.`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6366F1', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
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
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pending Uploads Banner */}
        {pendingUploads > 0 && (
          <TouchableOpacity
            style={styles.uploadBanner}
            onPress={handleProcessUploads}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
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
        )}

        {/* Locations List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading locations...</Text>
          </View>
        ) : (
          locations.map((location, index) => (
            <TouchableOpacity
              key={location.id}
              style={[styles.locationCard, { marginTop: index === 0 ? 0 : Spacing.md }]}
              onPress={() => navigation.navigate('JobSelect', { location })}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="location" size={24} color="white" />
                  </LinearGradient>
                </View>
                
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName} numberOfLines={1}>
                    {location.name}
                  </Text>
                  {location.address && (
                    <Text style={styles.locationAddress} numberOfLines={1}>
                      {location.address}
                    </Text>
                  )}
                </View>
                
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  uploadBanner: {
    marginBottom: Spacing.lg,
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
  loadingContainer: {
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  locationCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
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
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  locationAddress: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  chevronContainer: {
    marginLeft: Spacing.sm,
  },
});

