import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GamificationProvider } from './src/contexts/GamificationContext';
import SplashScreen from './src/components/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import JobSelectScreen from './src/screens/JobSelectScreen';
import CameraScreen from './src/screens/CameraScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <GamificationProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false, // Explicit boolean false
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              headerShown: false, // Explicit boolean
            }}
          />
          <Stack.Screen 
            name="JobSelect" 
            component={JobSelectScreen}
            options={{
              headerShown: false, // Explicit boolean
            }}
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen}
            options={{
              headerShown: false, // Explicit boolean
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GamificationProvider>
  );
}
