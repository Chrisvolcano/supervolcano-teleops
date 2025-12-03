/**
 * GOPRO STATUS BADGE
 * Shows GoPro connection status inline with session controls
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, AlertCircle } from 'lucide-react-native';
import { useGoPro } from '../contexts/GoProContext';
import { useNavigation } from '@react-navigation/native';

export default function GoProStatusBadge() {
  const { status, hasPairedDevice } = useGoPro();
  const navigation = useNavigation();

  if (!hasPairedDevice) {
    return (
      <TouchableOpacity 
        style={[styles.badge, styles.setupBadge]}
        onPress={() => navigation.navigate('GoProSetup' as never)}
      >
        <Camera size={16} color="#6B7280" />
        <Text style={styles.setupText}>Set up GoPro</Text>
      </TouchableOpacity>
    );
  }

  if (!status.isConnected) {
    return (
      <View style={[styles.badge, styles.disconnectedBadge]}>
        <AlertCircle size={16} color="#F59E0B" />
        <Text style={styles.disconnectedText}>GoPro not in range</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.connectedBadge]}>
      <Camera size={16} color="#10B981" />
      <Text style={styles.connectedText}>
        GoPro Ready • {status.batteryLevel}%
      </Text>
      {status.isRecording && (
        <View style={styles.recordingDot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  setupBadge: {
    backgroundColor: '#F3F4F6',
  },
  setupText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  disconnectedBadge: {
    backgroundColor: '#FEF3C7',
  },
  disconnectedText: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '500',
  },
  connectedBadge: {
    backgroundColor: '#D1FAE5',
  },
  connectedText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '500',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});

