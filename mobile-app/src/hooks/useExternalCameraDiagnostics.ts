import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

export type ExternalCameraConnectionStatus = 'unknown' | 'connected' | 'disconnected';

export type ExternalCameraDiagnostics = {
  connectionStatus: ExternalCameraConnectionStatus;
  isSupported: boolean;
  openSettings: () => void;
  refresh: () => void;
};

export function useExternalCameraDiagnostics(): ExternalCameraDiagnostics {
  const isSupported = Platform.OS === 'android';
  const [connectionStatus, setConnectionStatus] = useState<ExternalCameraConnectionStatus>(
    isSupported ? 'unknown' : 'disconnected'
  );

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const refresh = useCallback(() => {
    // TODO: Replace with ExternalCameraModule diagnostics.
    setConnectionStatus((status) => status);
  }, []);

  useEffect(() => {
    if (isSupported) {
      refresh();
    }
  }, [isSupported, refresh]);

  return {
    connectionStatus,
    isSupported,
    openSettings,
    refresh,
  };
}
