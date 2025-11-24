// Minimal test app to isolate navigation issues
// To use: Rename App.tsx to App.tsx.backup, then rename this to App.tsx

import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function TestScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SuperVolcano Mobile App</Text>
      <Text style={styles.subtext}>If you see this, navigation works!</Text>
      <Button
        title="Test Navigation"
        onPress={() => Alert.alert('Success', 'App is working!')}
      />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Test" 
          component={TestScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    color: '#e0e7ff',
    marginBottom: 32,
  },
});

