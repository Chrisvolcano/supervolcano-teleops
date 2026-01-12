import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExternalCameraConnectionStatus } from '../../hooks/useExternalCameraDiagnostics';

type CameraPermissionStatus = 'unknown' | 'granted' | 'denied';

type ExternalCameraPanelProps = {
  cameraPermissionStatus: CameraPermissionStatus;
  connectionStatus: ExternalCameraConnectionStatus;
  onOpenSettings?: () => void;
  style?: StyleProp<ViewStyle>;
  preview?: React.ReactNode;
};

type TestStatus = 'pass' | 'fail' | 'pending';

type TestRowProps = {
  title: string;
  status: TestStatus;
  statusLabel: string;
  helperText?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const getStatusMeta = (status: TestStatus) => {
  switch (status) {
    case 'pass':
      return { icon: 'checkmark-circle', color: '#22C55E' };
    case 'fail':
      return { icon: 'close-circle', color: '#EF4444' };
    case 'pending':
    default:
      return { icon: 'time-outline', color: '#F59E0B' };
  }
};

const TestRow = ({
  title,
  status,
  statusLabel,
  helperText,
  actionLabel,
  onAction,
}: TestRowProps) => {
  const meta = getStatusMeta(status);
  const showAction = actionLabel && onAction;

  return (
    <View style={styles.testRow}>
      <View style={styles.testRowMain}>
        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        <View style={styles.testRowText}>
          <Text style={styles.testTitle}>{title}</Text>
          <Text style={styles.testStatus}>
            {statusLabel}
          </Text>
          {!!helperText && <Text style={styles.testHelper}>{helperText}</Text>}
        </View>
      </View>
      {showAction && (
        <TouchableOpacity style={styles.testAction} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.testActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function ExternalCameraPanel({
  cameraPermissionStatus,
  connectionStatus,
  onOpenSettings,
  style,
  preview,
}: ExternalCameraPanelProps) {
  const permissionStatus: TestStatus =
    cameraPermissionStatus === 'granted'
      ? 'pass'
      : cameraPermissionStatus === 'denied'
      ? 'fail'
      : 'pending';

  const permissionLabel =
    cameraPermissionStatus === 'granted'
      ? 'Granted'
      : cameraPermissionStatus === 'denied'
      ? 'Not granted'
      : 'Checking';
  const permissionHelper =
    cameraPermissionStatus === 'denied'
      ? 'Allow camera access in settings.'
      : undefined;

  const connectionTestStatus: TestStatus =
    connectionStatus === 'connected'
      ? 'pass'
      : connectionStatus === 'disconnected'
      ? 'fail'
      : 'pending';

  const connectionLabel =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'disconnected'
      ? 'Not detected'
      : 'Checking';
  const connectionHelper =
    connectionStatus === 'connected'
      ? undefined
      : 'Connect an external camera to continue.';

  const showSettingsAction =
    cameraPermissionStatus === 'denied' && onOpenSettings;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.previewContainer}>
        {preview || (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="camera-outline" size={44} color="rgba(255,255,255,0.6)" />
            <Text style={styles.previewTitle}>External camera</Text>
            <Text style={styles.previewSubtitle}>Preview will appear here</Text>
          </View>
        )}
      </View>

      <View style={styles.testsCard}>
        <Text style={styles.testsTitle}>External camera checks</Text>
        <TestRow
          title="Camera permission"
          status={permissionStatus}
          statusLabel={permissionLabel}
          helperText={permissionHelper}
          actionLabel={showSettingsAction ? 'Open settings' : undefined}
          onAction={showSettingsAction ? onOpenSettings : undefined}
        />
        <TestRow
          title="External camera detected"
          status={connectionTestStatus}
          statusLabel={connectionLabel}
          helperText={connectionHelper}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 18,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  previewSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  testsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  testsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  testRowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  testRowText: {
    flex: 1,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  testStatus: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  testHelper: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  testAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  testActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
