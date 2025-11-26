/**
 * SIMPLIFIED RECORDING SCREEN
 * Record video and auto-upload
 * Last updated: 2025-11-26
 */

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { uploadVideo } from '../lib/uploadVideo';

export default function CameraScreen({ navigation }: any) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [recording, setRecording] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [uploading, setUploading] = useState(false);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#666" />
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.permissionText}>
            We need camera access to record cleaning videos.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (uploading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.uploadingText}>Uploading video...</Text>
      </View>
    );
  }

  async function handleStartRecording() {
    if (!cameraRef.current || recording) return;

    try {
      setRecording(true);
      console.log('Starting recording...');
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: 300, // 5 minutes max
      });
      
      console.log('Recording saved to:', video.uri);
      setRecording(false);
      
      if (video?.uri) {
        await handleUpload(video.uri);
      }
    } catch (error: any) {
      console.error('Recording error:', error);
      setRecording(false);
      Alert.alert('Error', 'Failed to record video');
    }
  }

  function handleStopRecording() {
    if (cameraRef.current && recording) {
      console.log('Stopping recording...');
      cameraRef.current.stopRecording();
      setRecording(false);
    }
  }

  async function handleUpload(videoUri: string) {
    try {
      setUploading(true);

      // Upload to Firebase Storage
      await uploadVideo(videoUri, {
        userId: 'cleaner', // TODO: Get from auth context
        userName: 'Cleaner',
        timestamp: new Date().toISOString(),
      });

      setUploading(false);
      
      Alert.alert(
        'Success!',
        'Video uploaded successfully',
        [
          {
            text: 'Record Another',
            onPress: () => {
              setUploading(false);
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to upload video');
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Top Bar */}
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            disabled={recording}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {recording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording</Text>
            </View>
          )}
        </SafeAreaView>

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsInner}>
            {!recording ? (
              <TouchableOpacity
                style={styles.recordButtonLarge}
                onPress={handleStartRecording}
              >
                <View style={styles.recordButtonCircle} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopRecording}
              >
                <View style={styles.stopButtonSquare} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.instruction}>
            {!recording ? 'Tap to start recording' : 'Tap to stop'}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButtonLarge: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
  },
  stopButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 40,
  },
  stopButtonSquare: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
