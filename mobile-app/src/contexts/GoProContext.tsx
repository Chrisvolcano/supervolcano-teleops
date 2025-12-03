/**
 * GOPRO CONTEXT
 * Provides GoPro status and controls throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { goProService, GoProStatus, GoProDevice } from '../services/gopro.service';

interface GoProContextType {
  status: GoProStatus;
  isScanning: boolean;
  foundDevices: GoProDevice[];
  hasPairedDevice: boolean;
  
  // Actions
  scan: () => Promise<void>;
  stopScan: () => void;
  connect: (deviceId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  forgetDevice: () => Promise<void>;
  connectToWiFi: (ssid: string, password: string) => Promise<boolean>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<boolean>;
}

const GoProContext = createContext<GoProContextType | undefined>(undefined);

export function GoProProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GoProStatus>({
    isConnected: false,
    isRecording: false,
    batteryLevel: 0,
    storageRemaining: 'Unknown',
  });
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<GoProDevice[]>([]);
  const [hasPairedDevice, setHasPairedDevice] = useState(false);

  // Check for paired device on mount
  useEffect(() => {
    goProService.hasPairedGoPro().then(setHasPairedDevice);
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = goProService.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  // Auto-connect on mount if paired
  useEffect(() => {
    if (hasPairedDevice) {
      goProService.autoConnect();
    }
  }, [hasPairedDevice]);

  const scan = useCallback(async () => {
    setIsScanning(true);
    setFoundDevices([]);
    
    try {
      await goProService.scanForGoPros((device) => {
        setFoundDevices(prev => {
          // Avoid duplicates
          if (prev.some(d => d.id === device.id)) return prev;
          return [...prev, device];
        });
      });
    } finally {
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    goProService.stopScan();
    setIsScanning(false);
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    const success = await goProService.connectAndPair(deviceId);
    if (success) {
      setHasPairedDevice(true);
    }
    return success;
  }, []);

  const disconnect = useCallback(async () => {
    await goProService.disconnect();
  }, []);

  const forgetDevice = useCallback(async () => {
    await goProService.forgetPairedDevice();
    setHasPairedDevice(false);
  }, []);

  const connectToWiFi = useCallback(async (ssid: string, password: string) => {
    const ip = await goProService.connectToWiFi(ssid, password);
    return !!ip;
  }, []);

  const startRecording = useCallback(async () => {
    return goProService.startRecording();
  }, []);

  const stopRecording = useCallback(async () => {
    return goProService.stopRecording();
  }, []);

  return (
    <GoProContext.Provider
      value={{
        status,
        isScanning,
        foundDevices,
        hasPairedDevice,
        scan,
        stopScan,
        connect,
        disconnect,
        forgetDevice,
        connectToWiFi,
        startRecording,
        stopRecording,
      }}
    >
      {children}
    </GoProContext.Provider>
  );
}

export function useGoPro() {
  const context = useContext(GoProContext);
  if (!context) {
    throw new Error('useGoPro must be used within GoProProvider');
  }
  return context;
}

