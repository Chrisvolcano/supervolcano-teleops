import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const gradientOpacity = useSharedValue(0.3);
  const loadingBarX = useSharedValue(-100);

  useEffect(() => {
    // Fade in animation
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withTiming(0, { duration: 800 });

    // Animated gradient overlay
    gradientOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      false
    );

    // Loading bar animation
    loadingBarX.value = withRepeat(
      withSequence(
        withTiming(100, { duration: 1500 }),
        withTiming(-100, { duration: 0 })
      ),
      -1,
      false
    );

    // Complete after 2.5 seconds
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 }, () => {
        onComplete();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: gradientOpacity.value,
    };
  });

  const loadingBarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: loadingBarX.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Base gradient background */}
      <LinearGradient
        colors={['#111827', '#1f2937', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated gradient overlay */}
      <Animated.View style={[styles.gradientOverlay, gradientAnimatedStyle]}>
        <LinearGradient
          colors={['rgba(37, 99, 235, 0.2)', 'transparent', 'rgba(96, 165, 250, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* VOLCANO text with gradient effect */}
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <LinearGradient
          colors={['#60a5fa', '#ffffff', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.textGradientWrapper}
        >
          <Text style={styles.volcanoText}>VOLCANO</Text>
        </LinearGradient>
        
        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBarTrack}>
            <Animated.View style={[styles.loadingBar, loadingBarStyle]}>
              <LinearGradient
                colors={['#3b82f6', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loadingBarGradient}
              />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  textGradientWrapper: {
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  volcanoText: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
    color: '#ffffff',
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingBarTrack: {
    width: 128,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
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

