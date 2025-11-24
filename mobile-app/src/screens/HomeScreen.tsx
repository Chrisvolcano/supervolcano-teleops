import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocations, testFetchSpecificLocation } from '../services/api';
import { getQueue, processQueue } from '../services/queue';
import { Location } from '../types';

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
        // TODO: Replace this ID with an actual location ID from your Firebase Console
        const testLocationId = 'bd577ffe-d733-4002-abb8-9ea047c0f326'; // Example ID - replace with real one
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
      await processQueue((item, progress) => {
        console.log(`Uploading ${item.jobTitle}: ${progress.toFixed(0)}%`);
      });
      
      Alert.alert('Success', 'All videos uploaded successfully!');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Some uploads failed. Check the queue.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SuperVolcano Camera</Text>
        <Text style={styles.subtitle}>Select a location to start recording</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Pending Uploads Banner */}
        {pendingUploads > 0 && (
          <TouchableOpacity
            style={styles.uploadBanner}
            onPress={handleProcessUploads}
          >
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <View style={styles.uploadBannerText}>
              <Text style={styles.uploadBannerTitle}>
                {pendingUploads} video{pendingUploads > 1 ? 's' : ''} ready to upload
              </Text>
              <Text style={styles.uploadBannerSubtitle}>Tap to upload now</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Locations List */}
        {loading ? (
          <Text style={styles.loadingText}>Loading locations...</Text>
        ) : (
          locations.map(location => (
            <TouchableOpacity
              key={location.id}
              style={styles.locationCard}
              onPress={() => navigation.navigate('JobSelect', { location })}
            >
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={24} color="#6366f1" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                {location.address && (
                  <Text style={styles.locationAddress}>{location.address}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
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
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  uploadBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uploadBannerSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
    marginTop: 2,
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 32,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#64748b',
  },
});

