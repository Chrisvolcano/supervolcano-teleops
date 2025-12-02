/**
 * SPLASH SCREEN - Premium Clean
 * Minimal, elegant animations
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoScale = useSharedValue(0.94);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    console.log('SplashScreen mounted');

    // Smooth ease-out curve - no bounce
    const smooth = Easing.bezier(0.25, 0.1, 0.25, 1);

    // 1. Logo fades in with subtle scale
    logoOpacity.value = withTiming(1, { duration: 500, easing: smooth });
    logoScale.value = withTiming(1, { duration: 600, easing: smooth });

    // 2. Title fades in
    textOpacity.value = withDelay(350, withTiming(1, { duration: 450, easing: smooth }));

    // 3. Progress bar fills
    progressWidth.value = withDelay(
      500,
      withTiming(100, { duration: 1700, easing: smooth })
    );

    // 4. Fade out
    const exitTimer = setTimeout(() => {
      console.log('SplashScreen: Starting exit');
      containerOpacity.value = withTiming(0, { duration: 300, easing: smooth }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    }, 2400);

    return () => clearTimeout(exitTimer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0A0A0A', '#141414', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <LinearGradient
            colors={['#007AFF', '#0055D4']}
            style={styles.logoGradient}
          >
            <Ionicons name="videocam" size={42} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.titleSuper}>SUPER</Text>
          <Text style={styles.titleVolcano}>VOLCANO</Text>
        </Animated.View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressStyle]}>
            <LinearGradient
              colors={['#007AFF', '#00C7FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
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
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  logoGradient: {
    width: 92,
    height: 92,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  titleSuper: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 5,
    marginBottom: 6,
  },
  titleVolcano: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    left: 50,
    right: 50,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});
