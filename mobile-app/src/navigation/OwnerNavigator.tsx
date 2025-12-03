/**
 * OWNER NAVIGATOR
 * Navigation stack for location owners
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Owner Screens
import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import AddLocationScreen from '../screens/owner/AddLocationScreen';
import LocationWizardScreen from '../screens/owner/LocationWizardScreen';
import LocationDetailScreen from '../screens/owner/LocationDetailScreen';
import InviteCleanerScreen from '../screens/owner/InviteCleanerScreen';
import OwnerSettingsScreen from '../screens/owner/OwnerSettingsScreen';

export type OwnerStackParamList = {
  OwnerTabs: undefined;
  AddLocation: undefined;
  LocationWizard: { locationId: string; locationName: string };
  LocationDetail: { locationId: string };
  InviteCleaner: { locationId: string; locationName: string };
};

const Stack = createNativeStackNavigator<OwnerStackParamList>();
const Tab = createBottomTabNavigator();

function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Locations"
        component={OwnerHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={OwnerSettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function OwnerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      <Stack.Screen 
        name="AddLocation" 
        component={AddLocationScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="LocationWizard" 
        component={LocationWizardScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="LocationDetail" component={LocationDetailScreen} />
      <Stack.Screen 
        name="InviteCleaner" 
        component={InviteCleanerScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

