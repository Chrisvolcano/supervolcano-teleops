/**
 * SUPERVOLCANO CAMERA APP
 * Flow: Splash → Login → Locations → Camera → Upload
 * Last updated: 2025-01-26
 */

import React, { useState, useEffect, ErrorInfo, Component } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SplashScreen from './src/components/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import LocationsScreen from './src/screens/LocationsScreen';
import CameraScreen from './src/screens/CameraScreen';

const Stack = createNativeStackNavigator();

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

function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    console.log('[App] Auth state:', { user: user?.email, loading });
  }, [user, loading]);

  // Show splash screen initially
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          // Not authenticated - show login
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
          />
        ) : (
          // Authenticated - show app screens
          <>
            <Stack.Screen 
              name="Locations" 
              component={LocationsScreen}
            />
            <Stack.Screen 
              name="Camera" 
              component={CameraScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  console.log('[App] Initializing...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
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
