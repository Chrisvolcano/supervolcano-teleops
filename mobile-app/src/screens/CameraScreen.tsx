/**
 * CAMERA SCREEN - Cross-Platform with Offline Support
 * Continuous recording with background segment uploads
 * Videos persist locally until confirmed uploaded
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  Animated,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { UploadQueueService } from '@/services/upload-queue.service';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import * as Haptics from 'expo-haptics';

const SEGMENT_DURATION = 300; // 5 minutes in seconds

export default function CameraScreen({ route, navigation }: any) {
  const { locationId, address } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Upload queue status
  const uploadQueue = useUploadQueue();
  
  // Toast notifications
  const { toast, showToast, hideToast } = useToast();

  // Recording state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [segmentsRecorded, setSegmentsRecorded] = useState(0);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionActiveRef = useRef(false);
  const appState = useRef(AppState.currentState);

  // Initialize upload queue service
  useEffect(() => {
    UploadQueueService.initialize();
    
    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app going to background/foreground
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('[Camera] App came to foreground, processing queue');
      UploadQueueService.processQueue();
    }
    appState.current = nextAppState;
  };

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Timer for elapsed time
  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSessionActive]);

  // Track uploads and show success toast
  const prevTotal = useRef(0);
  const hasRecordedRef = useRef(false);
  
  useEffect(() => {
    // Track when we've recorded segments
    if (segmentsRecorded > 0) {
      hasRecordedRef.current = true;
    }
    
    // Show toast when upload completes (total decreases after we've recorded)
    if (
      hasRecordedRef.current &&
      prevTotal.current > 0 &&
      uploadQueue.total < prevTotal.current &&
      uploadQueue.uploading === 0
    ) {
      showToast('Video saved successfully', 'success');
    }
    
    prevTotal.current = uploadQueue.total;
  }, [uploadQueue.total, uploadQueue.uploading, segmentsRecorded, showToast]);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Truncate address for display
  const truncateAddress = (addr: string, maxLength: number = 28): string => {
    if (!addr) return 'Unknown Location';
    return addr.length > maxLength
      ? addr.substring(0, maxLength) + '...'
      : addr;
  };

  // Start recording session
  const startSession = async () => {
    console.log('[Camera] Starting session...');
    setIsSessionActive(true);
    sessionActiveRef.current = true;
    setElapsedTime(0);
    setSegmentsRecorded(0);

    await recordSegment();
  };

  // Stop recording session
  const stopSession = async () => {
    console.log('[Camera] Stopping session...');
    setIsSessionActive(false);
    sessionActiveRef.current = false;

    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }

    // Haptic feedback when session ends
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Record a single segment
  const recordSegment = async () => {
    if (!cameraRef.current || !sessionActiveRef.current) return;

    try {
      setIsRecording(true);
      console.log('[Camera] Recording segment...');

      const video = await cameraRef.current.recordAsync({
        maxDuration: SEGMENT_DURATION,
      });

      console.log('[Camera] Segment complete:', video?.uri);
      setIsRecording(false);

      if (video?.uri && user) {
        // Queue for upload (handles persistence and upload)
        setSegmentsRecorded((prev) => prev + 1);
        
        await UploadQueueService.addToQueue(
          video.uri,
          locationId,
          user.uid,
          user.organizationId
        );

        // If session still active, start next segment immediately
        if (sessionActiveRef.current) {
          console.log('[Camera] Starting next segment...');
          recordSegment();
        }
      }
    } catch (error: any) {
      console.error('[Camera] Recording error:', error);
      setIsRecording(false);

      // If session active, try to recover
      if (sessionActiveRef.current) {
        setTimeout(() => recordSegment(), 1000);
      }
    }
  };

  // Handle record button press
  const handleRecordPress = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  // Handle back/close
  const handleClose = () => {
    if (isSessionActive) {
      Alert.alert(
        'Stop Recording?',
        'This will end your session. All recorded segments are saved locally and will upload automatically.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop & Exit',
            style: 'destructive',
            onPress: () => {
              stopSession();
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Get status message
  const getStatusMessage = (): string => {
    if (isSessionActive) {
      if (segmentsRecorded === 0) {
        return 'Recording...';
      }
      return `${segmentsRecorded} segment${segmentsRecorded > 1 ? 's' : ''} saved`;
    }

    if (uploadQueue.total > 0) {
      if (uploadQueue.isUploading) {
        return `Uploading ${uploadQueue.uploading} of ${uploadQueue.total}...`;
      }
      if (uploadQueue.failed > 0) {
        return `${uploadQueue.failed} failed • Tap to retry`;
      }
      return `${uploadQueue.pending} pending upload${uploadQueue.pending > 1 ? 's' : ''}`;
    }

    return 'Tap to start recording';
  };

  // Header pill component - handles platform differences
  const HeaderPill = ({ children }: { children: React.ReactNode }) => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView intensity={60} tint="dark" style={styles.headerPill}>
          {children}
        </BlurView>
      );
    }
    return (
      <View style={[styles.headerPill, styles.headerPillAndroid]}>
        {children}
      </View>
    );
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
          <Ionicons name="camera-outline" size={64} color="#666" />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
          We need camera and microphone access to record your session.
          </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
          activeOpacity={0.8}
        >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
      </View>
    );
  }

  if (!locationId || !user) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
          <Ionicons name="location-outline" size={64} color="#666" />
        <Text style={styles.permissionTitle}>Missing Information</Text>
          <Text style={styles.permissionText}>
          Location information is required to start recording.
          </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
      </View>
    );
  }

  // Main camera view
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Toast notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Full-screen camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="video"
        videoQuality="1080p"
      />

      {/* Top floating header */}
      <View style={[styles.topContainer, { top: insets.top + 10 }]}>
        <HeaderPill>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.locationContainer}>
            <Ionicons
              name="location"
              size={14}
              color="rgba(255,255,255,0.8)"
              style={styles.locationIcon}
            />
            <Text style={styles.addressText} numberOfLines={1}>
              {truncateAddress(address)}
            </Text>
          </View>

          {isSessionActive && (
            <Animated.View
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.recordingDot} />
            </Animated.View>
          )}

          {/* Queue indicator when not recording */}
          {!isSessionActive && uploadQueue.total > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>{uploadQueue.total}</Text>
            </View>
          )}
        </HeaderPill>
      </View>

      {/* Bottom floating controls */}
      <View style={[styles.bottomContainer, { bottom: insets.bottom + 30 }]}>
        {/* Timer display */}
        {isSessionActive && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
          </View>
        )}

        {/* Record button */}
              <TouchableOpacity
          onPress={handleRecordPress}
          style={styles.recordButtonOuter}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.recordButtonInner,
              isSessionActive && styles.recordButtonActive,
            ]}
          >
            {isSessionActive ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.recordIcon} />
            )}
          </View>
        </TouchableOpacity>

        {/* Status text */}
        <TouchableOpacity
          style={styles.statusContainer}
          onPress={uploadQueue.failed > 0 ? uploadQueue.retryFailed : undefined}
          activeOpacity={uploadQueue.failed > 0 ? 0.7 : 1}
        >
          {uploadQueue.isUploading && (
            <ActivityIndicator
              size="small"
              color="rgba(255,255,255,0.8)"
              style={styles.uploadingSpinner}
            />
          )}
          <Text
            style={[
              styles.statusText,
              uploadQueue.failed > 0 && styles.statusTextWarning,
            ]}
          >
            {getStatusMessage()}
          </Text>
        </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  backLink: {
    marginTop: 24,
    padding: 10,
  },
  backLinkText: {
    fontSize: 16,
    color: '#888',
  },

  // Top header
  topContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    overflow: 'hidden',
  },
  headerPillAndroid: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  locationIcon: {
    marginRight: 6,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  recordingIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff3b30',
  },
  queueBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Bottom controls
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  timerContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timerText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    ...Platform.select({
      ios: {
        fontFamily: 'Helvetica Neue',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  recordButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  recordIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff3b30',
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  uploadingSpinner: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  statusTextWarning: {
    color: '#FFD60A',
  },
});
