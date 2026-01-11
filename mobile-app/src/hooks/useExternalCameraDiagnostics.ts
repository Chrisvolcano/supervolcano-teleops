import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

export type UsbPermissionStatus = 'unknown' | 'granted' | 'denied';
export type ExternalCameraConnectionStatus = 'unknown' | 'connected' | 'disconnected';

export type ExternalCameraDiagnostics = {
  usbPermissionStatus: UsbPermissionStatus;
  connectionStatus: ExternalCameraConnectionStatus;
  isSupported: boolean;
  openSettings: () => void;
  refresh: () => void;
};

export function useExternalCameraDiagnostics(): ExternalCameraDiagnostics {
  const isSupported = Platform.OS === 'android';
  const [usbPermissionStatus, setUsbPermissionStatus] = useState<UsbPermissionStatus>(
    isSupported ? 'unknown' : 'denied'
  );
  const [connectionStatus, setConnectionStatus] = useState<ExternalCameraConnectionStatus>(
    isSupported ? 'unknown' : 'disconnected'
  );

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const refresh = useCallback(() => {
    // TODO: Replace with ExternalCameraModule diagnostics.
    setUsbPermissionStatus((status) => status);
    setConnectionStatus((status) => status);
  }, []);

  useEffect(() => {
    if (isSupported) {
      refresh();
    }
  }, [isSupported, refresh]);

  return {
    usbPermissionStatus,
    connectionStatus,
    isSupported,
    openSettings,
    refresh,
  };
}
