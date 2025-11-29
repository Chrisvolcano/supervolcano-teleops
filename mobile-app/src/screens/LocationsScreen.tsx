/**
 * LOCATIONS SCREEN
 * Shows locations assigned to current user
 * Filters by organizationId match
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { LocationsService } from '@/services/locations.service';
import type { UserProfile, Location } from '@/types/user.types';

export default function LocationsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadLocations();
    }
  }, [user]);

  async function loadLocations() {
    if (!user?.uid) {
      Alert.alert('Error', 'Not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      // Now queries by user ID via assignments collection
      const locs = await LocationsService.getAssignedLocations(user.uid);
      setLocations(locs);
    } catch (error: any) {
      Alert.alert('Error Loading Locations', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadLocations();
  }

  async function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  }

  function handleLocationPress(location: Location) {
    // Navigate to camera with location context
    navigation.navigate('Camera', { 
      locationId: location.id, 
      address: location.address 
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Locations</Text>
          <Text style={styles.headerSubtitle}>
            {user?.displayName || user?.email}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Locations List */}
      {locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Locations Assigned</Text>
          <Text style={styles.emptyText}>
            Contact your manager to get assigned to locations
          </Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleLocationPress(item)}
              style={styles.locationCard}
              activeOpacity={0.7}
            >
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={24} color="#2563eb" />
              </View>
              <View style={styles.locationInfo}>
                {item.name && item.name !== item.address && (
                  <Text style={styles.locationName}>{item.name}</Text>
                )}
                <Text style={styles.locationAddress}>{item.address}</Text>
                <Text style={styles.locationHint}>Tap to start recording</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  locationIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#dbeafe',
    borderRadius: 24,
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
    color: '#111827',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    marginBottom: 4,
  },
  locationHint: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

