/**
 * SUPERVOLCANO MOBILE APP
 * Dual-persona app: Owner and Cleaner flows
 * Routes based on user role
 * Last updated: 2025-12-02
 */

import React, { ErrorInfo, Component } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
// TEMPORARILY DISABLED FOR EXPO GO TESTING
// BLE library (react-native-ble-plx) doesn't work in Expo Go - requires native build
// import { GoProProvider } from './src/contexts/GoProContext';
import AppNavigator from './src/navigation/AppNavigator';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Stack:', error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={styles.errorHint}>
            Please close and reopen the app. If the problem persists, contact support.
          </Text>
          <Text style={styles.errorDetails}>
            Error: {this.state.error?.toString()}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  console.log('[App] Initializing...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        {/* TEMPORARILY DISABLED FOR EXPO GO TESTING */}
        {/* <GoProProvider> */}
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        {/* </GoProProvider> */}
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f1d1d',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  errorHint: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 12,
    color: '#991b1b',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginTop: 16,
  },
});
