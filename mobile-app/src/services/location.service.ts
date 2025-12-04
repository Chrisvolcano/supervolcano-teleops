/**
 * LOCATION SERVICE
 * Handles GPS location and reverse geocoding
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface AddressResult {
  formattedAddress: string;
  streetNumber?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

class LocationService {
  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in Settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Location] Permission error:', error);
      return false;
    }
  }

  /**
   * Get current location coordinates
   */
  async getCurrentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('[Location] Get coordinates error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<AddressResult | null> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (!results || results.length === 0) {
        return null;
      }

      const result = results[0];

      // Build formatted address
      const addressParts = [
        result.streetNumber,
        result.street,
      ].filter(Boolean);
      
      const streetAddress = addressParts.join(' ');
      
      const fullAddressParts = [
        streetAddress,
        result.city,
        result.region,
        result.postalCode,
      ].filter(Boolean);

      return {
        formattedAddress: fullAddressParts.join(', '),
        streetNumber: result.streetNumber || undefined,
        street: result.street || undefined,
        city: result.city || undefined,
        region: result.region || undefined,
        postalCode: result.postalCode || undefined,
        country: result.country || undefined,
        latitude,
        longitude,
      };
    } catch (error) {
      console.error('[Location] Reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Get current address (combines getCurrentCoordinates + reverseGeocode)
   */
  async getCurrentAddress(): Promise<AddressResult | null> {
    try {
      const coords = await this.getCurrentCoordinates();
      if (!coords) return null;

      const address = await this.reverseGeocode(coords.latitude, coords.longitude);
      return address;
    } catch (error) {
      console.error('[Location] Get current address error:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();

