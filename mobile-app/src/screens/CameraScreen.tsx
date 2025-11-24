import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Location, Job } from '../types';
import { addToQueue } from '../services/queue';

export default function CameraScreen({ route, navigation }: any) {
  const { location, job } = route.params as { location: Location; job: Job };
  const [permission, requestPermission] = useCameraPermissions();
  const [recording, setRecording] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#94a3b8" />
          <Text style={styles.permissionTitle}>Camera Permission Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to record videos for robot learning.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{job.title}</Text>
            <Text style={styles.headerSubtitle}>{location.name}</Text>
          </View>
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.headerButton}>
            <Ionicons name="camera-reverse" size={32} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Recording Indicator */}
        {recording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsInner}>
            {recording ? (
              <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={startRecording} style={styles.recordButton}>
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.instructionText}>
            {recording ? 'Tap to stop recording' : 'Tap to start recording'}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 2,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    alignItems: 'center',
  },
  controlsInner: {
    marginBottom: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonInner: {
    width: 40,
    height: 40,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  instructionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

