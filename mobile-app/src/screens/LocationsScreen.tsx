/**
 * LOCATIONS SCREEN - Premium Minimal
 * Clean, restrained, elegant
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  Platform,
  Animated,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { LocationsService } from '@/services/locations.service';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import type { Location } from '@/types/user.types';

export default function LocationsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const uploadQueue = useUploadQueue();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadLocations();
    }
  }, [user]);

  const loadLocations = async () => {
    if (!user?.organizationId) {
      Alert.alert('Error', 'No organization assigned.');
      setLoading(false);
      return;
    }

    try {
      const locs = await LocationsService.getAssignedLocations(user.organizationId);
      setLocations(locs);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLocations();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Sign Out'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
          title: user?.displayName || user?.email || 'Account',
          message: user?.email && user?.displayName ? user.email : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            signOut();
          }
        }
      );
    } else {
      // Android fallback - use Alert
      Alert.alert(
        user?.displayName || 'Account',
        user?.email || '',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              signOut();
            },
          },
        ]
      );
    }
  };

  const handleLocationPress = (location: Location) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Camera', {
      locationId: location.id,
      address: location.address,
    });
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = (): string => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  };

  const getFormattedDate = (): string => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#8E8E93" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8E8E93"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Greeting */}
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.userName}>{getFirstName()}</Text>
                <Text style={styles.dateText}>{getFormattedDate()}</Text>
              </View>
              <TouchableOpacity
                onPress={handleAvatarPress}
                activeOpacity={0.7}
                style={styles.avatarButton}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getFirstName().charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Upload Status - Only show if pending */}
            {uploadQueue.total > 0 && (
              <TouchableOpacity
                style={styles.uploadStatus}
                activeOpacity={0.7}
                onPress={uploadQueue.failed > 0 ? uploadQueue.retryFailed : undefined}
              >
                {uploadQueue.isUploading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons
                    name={uploadQueue.failed > 0 ? 'alert-circle' : 'cloud-upload-outline'}
                    size={16}
                    color={uploadQueue.failed > 0 ? '#FF9500' : '#007AFF'}
                  />
                )}
                <Text style={[
                  styles.uploadStatusText,
                  uploadQueue.failed > 0 && styles.uploadStatusTextWarning
                ]}>
                  {uploadQueue.isUploading
                    ? `Uploading ${uploadQueue.uploading}...`
                    : uploadQueue.failed > 0
                    ? `${uploadQueue.failed} failed`
                    : `${uploadQueue.pending} pending`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {locations.length === 1 ? '1 Location' : `${locations.length} Locations`}
              </Text>
              <Text style={styles.sectionHint}>Tap to start recording</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <LocationCard
            location={item}
            onPress={() => handleLocationPress(item)}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color="#D1D1D6" />
            <Text style={styles.emptyTitle}>No locations yet</Text>
            <Text style={styles.emptyText}>
              Pull down to refresh
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Location Card with staggered entrance
function LocationCard({
  location,
  onPress,
  index,
}: {
  location: Location;
  onPress: () => void;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Staggered entrance animation
  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
      >
        <View style={styles.cardIcon}>
          <Ionicons name="home" size={18} color="#007AFF" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {location.name || 'Property'}
          </Text>
          <Text style={styles.cardAddress} numberOfLines={1}>
            {location.address}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    color: '#C7C7CC',
    fontWeight: '500',
    marginTop: 4,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  // Upload Status
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  uploadStatusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  uploadStatusTextWarning: {
    color: '#FF9500',
  },
  // Section
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  sectionHint: {
    fontSize: 13,
    color: '#C7C7CC',
    fontWeight: '400',
    marginTop: 2,
  },
  // Card
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    padding: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  cardAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
