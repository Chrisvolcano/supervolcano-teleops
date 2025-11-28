import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function AnimatedBackground() {
  return (
    <View style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#FFFFFF',
  },
});

