/**
 * APP NAVIGATOR
 * Routes to Owner or Cleaner stack based on user role
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from '../components/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import OwnerNavigator from './OwnerNavigator';
import CleanerNavigator from './CleanerNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, userProfile, loading } = useAuth();

  // Show splash while checking auth
  if (loading) {
    return <SplashScreen onComplete={() => {}} />;
  }

  // Not logged in
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Logged in - route based on role
  const role = userProfile?.role;
  console.log('[AppNavigator] User role:', role);

  if (role === 'location_owner') {
    return <OwnerNavigator />;
  }

  // Default to cleaner flow (location_cleaner, oem_teleoperator, etc.)
  return <CleanerNavigator />;
}

