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
  const clipPath = useSharedValue(100); // Start fully clipped (100% hidden from left)
  const loadingBarX = useSharedValue(-100);

  useEffect(() => {
    console.log('SplashScreen mounted');
    
    // Start left-to-right reveal animation
    clipPath.value = withTiming(0, { duration: 1500 }, () => {
      console.log('SplashScreen: Reveal animation complete');
    });

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

  const textRevealStyle = useAnimatedStyle(() => {
    // Simulate clipPath with translateX and opacity
    // We'll use a mask approach instead
    return {
      transform: [{ translateX: clipPath.value * -1 }],
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

      {/* VOLCANO text */}
      <View style={styles.textContainer}>
        {/* Background text (grey) */}
        <Text style={styles.backgroundText}>VOLCANO</Text>
        
        {/* Foreground text (black) with reveal */}
        <Animated.View style={[styles.foregroundTextContainer, textRevealStyle]}>
          <LinearGradient
            colors={['#000000', '#171717', '#262626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientText}
          >
            <Text style={styles.foregroundText}>VOLCANO</Text>
          </LinearGradient>
        </Animated.View>
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
  backgroundText: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    color: '#D4D4D4', // neutral-300
    opacity: 0.5,
  },
  foregroundTextContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  gradientText: {
    width: '100%',
    height: '100%',
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
