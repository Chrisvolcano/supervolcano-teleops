/**
 * CAMERA SCREEN
 * Record video and auto-upload to Firebase
 * Receives locationId and address from navigation params
 */

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { VideoUploadService } from '@/services/video-upload.service';

export default function CameraScreen({ route, navigation }: any) {
  const { locationId, address } = route.params || {};
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
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

  if (!locationId || !user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={64} color="#666" />
          <Text style={styles.errorText}>Missing Information</Text>
          <Text style={styles.permissionText}>
            Location information is missing. Please go back and select a location.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function handleRecordPress() {
    if (recording) {
      // Stop recording
      if (cameraRef.current) {
        try {
          const video = await cameraRef.current.stopRecording();
          setVideoUri(video.uri);
          setRecording(false);
        } catch (error: any) {
          console.error('Error stopping recording:', error);
          Alert.alert('Error', 'Failed to stop recording');
          setRecording(false);
        }
      }
    } else {
      // Start recording
      if (cameraRef.current) {
        try {
          setRecording(true);
          await cameraRef.current.recordAsync({
            maxDuration: 300, // 5 minutes max
          });
        } catch (error: any) {
          console.error('Error starting recording:', error);
          Alert.alert('Error', 'Failed to start recording');
          setRecording(false);
        }
      }
    }
  }

  async function handleUpload() {
    if (!videoUri || !user || !locationId) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      await VideoUploadService.uploadVideo(
        videoUri,
        locationId,
        user.uid,
        user.organizationId,
        (progress) => {
          setUploadProgress(progress.progress);
        }
      );

      Alert.alert(
        'Upload Complete',
        'Your video has been uploaded successfully!',
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleRetake() {
    setVideoUri(null);
    setUploadProgress(0);
  }

  // Show video preview after recording
  if (videoUri) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          useNativeControls
          resizeMode="contain"
          isLooping
        />

        {/* Controls Overlay */}
        <SafeAreaView style={styles.previewControls}>
          <View style={styles.previewControlsContent}>
            <TouchableOpacity
              onPress={handleRetake}
              disabled={uploading}
              style={[styles.previewButton, styles.retakeButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.previewButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              style={[styles.previewButton, styles.uploadButton]}
              activeOpacity={0.8}
            >
              {uploading ? (
                <View style={styles.uploadProgressContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <Text style={styles.previewButtonText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
        videoQuality="1080p"
      >
        {/* Header Overlay */}
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            disabled={recording}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.locationText} numberOfLines={1}>
            {address || 'Location'}
          </Text>
          <View style={{ width: 44 }} />
        </SafeAreaView>

        {/* Recording Indicator */}
        {recording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}

        {/* Record Button */}
        <SafeAreaView style={styles.controls}>
          <View style={styles.controlsInner}>
            <TouchableOpacity
              onPress={handleRecordPress}
              style={[styles.recordButton, recording && styles.recordButtonActive]}
              activeOpacity={0.8}
              disabled={uploading}
            >
              {recording ? (
                <View style={styles.stopButtonSquare} />
              ) : (
                <View style={styles.recordButtonCircle} />
              )}
            </TouchableOpacity>
            <Text style={styles.instruction}>
              {recording ? 'Tap to stop' : 'Tap to record'}
            </Text>
          </View>
        </SafeAreaView>
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
  video: {
    flex: 1,
    backgroundColor: '#000',
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  locationText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlsInner: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recordButtonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
  },
  recordButtonActive: {
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
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingTop: 20,
    paddingBottom: 40,
  },
  previewControlsContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retakeButton: {
    backgroundColor: '#6b7280',
  },
  uploadButton: {
    backgroundColor: '#2563eb',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
