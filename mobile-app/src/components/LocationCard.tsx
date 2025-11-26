import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface LocationCardProps {
  location: {
    id: string;
    name: string;
    address: string;
    tasksCompleted?: number;
    tasksTotal?: number;
  };
  onPress: () => void;
}

export default function LocationCard({ location, onPress }: LocationCardProps) {
  const tasksCompleted = location.tasksCompleted || 0;
  const tasksTotal = location.tasksTotal || 0;
  const progress = tasksTotal > 0 
    ? (tasksCompleted / tasksTotal) * 100 
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <View style={styles.cardContainer}>

        {/* Card content */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color="#3B82F6" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.locationName} numberOfLines={1}>
                {location.name}
              </Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {location.address}
              </Text>
            </View>
          </View>

          {/* Progress Section */}
          {tasksTotal > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.statText}>
                    {tasksCompleted} completed
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="time" size={16} color="#F59E0B" />
                  <Text style={styles.statText}>
                    {tasksTotal - tasksCompleted} pending
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill,
                      { width: `${progress}%` }
                    ]}
                  >
                    <LinearGradient
                      colors={['#3B82F6', '#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressGradient}
                    />
                  </View>
                </View>
                <Text style={styles.progressText}>
                  {Math.round(progress)}%
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressSection: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    minWidth: 40,
    textAlign: 'right',
  },
});

