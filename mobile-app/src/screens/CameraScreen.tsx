import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Location, Job } from '../types';
import { addToQueue } from '../services/queue';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Design';

export default function CameraScreen({ route, navigation }: any) {
  const { location, job } = route.params as { location: Location; job: Job };
  const [permission, requestPermission] = useCameraPermissions();
  const [recording, setRecording] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recording]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="camera-outline" size={64} color={Colors.textTertiary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to record instructional videos for robot learning.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function startRecording() {
    if (!cameraRef.current || recording) return;

    try {
      setRecording(true);
      console.log('Starting recording...');
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: 300, // 5 minutes max
      });

      console.log('Recording saved to:', video.uri);

      // Add to upload queue
      await addToQueue({
        videoUri: video.uri,
        locationId: location.id,
        locationName: location.name,
        jobId: job.id,
        jobTitle: job.title,
        timestamp: new Date(),
      });

      Alert.alert(
        'Video Saved',
        'Video added to upload queue. It will upload when you return to the home screen.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error: any) {
      console.error('Recording failed:', error);
      Alert.alert('Error', 'Failed to record video: ' + error.message);
    } finally {
      setRecording(false);
    }
  }

  function stopRecording() {
    if (!cameraRef.current || !recording) return;
    
    console.log('Stopping recording...');
    cameraRef.current.stopRecording();
    setRecording(false);
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
        animateShutter={false}
        enableTorch={false}
      >
        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{job.title}</Text>
            <Text style={styles.headerSubtitle}>{location.name}</Text>
          </View>
          <TouchableOpacity 
            onPress={toggleCameraFacing} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Recording Indicator */}
        {recording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controlsContainer}>
          {/* Task Info */}
          <View style={styles.taskInfoBar}>
            <View>
              <Text style={styles.taskInfoTitle}>{job.title}</Text>
              {job.description && (
                <Text style={styles.taskInfoDescription} numberOfLines={2}>
                  {job.description}
                </Text>
              )}
            </View>
          </View>

          {/* Record Button */}
          <View style={styles.controlsContent}>
            <Text style={styles.hint}>
              {recording ? 'Tap to stop recording' : 'Tap to start recording'}
            </Text>
            
            <TouchableOpacity
              style={styles.recordButtonContainer}
              onPress={recording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <Animated.View 
                style={[
                  styles.recordButton,
                  recording && styles.recordButtonActive,
                  { transform: [{ scale: recording ? pulseAnim : 1 }] }
                ]}
              >
                {recording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <View style={styles.recordIcon} />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.textPrimary,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.titleSmall,
    color: '#fff',
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.xs,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingText: {
    ...Typography.labelLarge,
    color: '#fff',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.textPrimary,
  },
  taskInfoBar: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskInfoTitle: {
    ...Typography.titleMedium,
    color: 'white',
    marginBottom: Spacing.xs,
  },
  taskInfoDescription: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controlsContent: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  hint: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  recordButtonActive: {
    backgroundColor: Colors.error,
  },
  recordIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    backgroundColor: Colors.textPrimary,
  },
  permissionIconContainer: {
    marginBottom: Spacing.xxl,
  },
  permissionTitle: {
    ...Typography.titleLarge,
    color: 'white',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    ...Typography.labelLarge,
    color: 'white',
  },
});

