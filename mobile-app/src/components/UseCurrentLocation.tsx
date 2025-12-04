/**
 * USE CURRENT LOCATION BUTTON
 * Tappable button that gets GPS location and returns address
 */

import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Navigation } from 'lucide-react-native';
import { locationService, AddressResult } from '../services/location.service';

interface UseCurrentLocationProps {
  onAddressFound: (address: AddressResult) => void;
  style?: object;
}

export default function UseCurrentLocation({ onAddressFound, style }: UseCurrentLocationProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);

    try {
      const address = await locationService.getCurrentAddress();

      if (address) {
        onAddressFound(address);
      } else {
        Alert.alert(
          'Could Not Get Location',
          'Please make sure location services are enabled and try again, or enter the address manually.'
        );
      }
    } catch (error) {
      console.error('[UseCurrentLocation] Error:', error);
      Alert.alert(
        'Location Error',
        'Something went wrong getting your location. Please enter the address manually.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Getting location...</Text>
        </>
      ) : (
        <>
          <Navigation size={18} color="#3B82F6" />
          <Text style={styles.buttonText}>Use Current Location</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
});

