import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const opacity = useSharedValue(1);
  const loadingBarX = useSharedValue(-100);

  useEffect(() => {
    console.log('SplashScreen mounted');

    // Loading bar animation
    loadingBarX.value = withSequence(
      withTiming(100, { duration: 1200 }),
      withTiming(-100, { duration: 0 }),
      withTiming(100, { duration: 1200 })
    );

    // Start exit after 3 seconds
    const exitTimer = setTimeout(() => {
      console.log('SplashScreen: Starting exit animation');
      opacity.value = withTiming(0, { duration: 500 }, () => {
        console.log('SplashScreen: Exit animation complete');
      });
    }, 3000);

    // Call onComplete after fade out
    const completeTimer = setTimeout(() => {
      console.log('SplashScreen: Calling onComplete');
      onComplete();
    }, 3500); // 3s display + 0.5s fade out

    return () => {
      console.log('SplashScreen: Cleaning up timers');
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const loadingBarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: loadingBarX.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="dark-content" />
      
      {/* White background */}
      <View style={styles.background} />

      {/* VOLCANO text container */}
      <View style={styles.textContainer}>
        {/* Black text - no animation */}
              <Text style={styles.foregroundText}>VOLCANO</Text>
      </View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBarTrack}>
          <Animated.View style={[styles.loadingBar, loadingBarStyle]}>
            <LinearGradient
              colors={['#262626', '#000000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loadingBarGradient}
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  foregroundText: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    color: '#000000',
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingBarTrack: {
    width: 192,
    height: 2,
    backgroundColor: '#E5E5E5', // neutral-200
    borderRadius: 1,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '100%',
    height: '100%',
  },
  loadingBarGradient: {
    width: '100%',
    height: '100%',
  },
});
