import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocations } from '../services/api';
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
      const locs = await fetchLocations();
      setLocations(locs);
      
      const queue = await getQueue();
      const pending = queue.filter(item => item.status === 'pending' || item.status === 'error').length;
      setPendingUploads(pending);
    } catch (error) {
      Alert.alert('Error', 'Failed to load locations');
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
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
      >
        <Text style={styles.title}>SuperVolcano Camera</Text>
        <Text style={styles.subtitle}>Select a location to start recording</Text>
      </LinearGradient>

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

