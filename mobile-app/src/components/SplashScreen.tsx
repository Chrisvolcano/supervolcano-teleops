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
  const revealWidth = useSharedValue(0); // Start at 0 (fully hidden)
  const loadingBarX = useSharedValue(-100);

  useEffect(() => {
    console.log('SplashScreen mounted');
    
    // Start left-to-right reveal animation
    revealWidth.value = withTiming(100, { duration: 1500 }, () => {
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

  // Reveal mask that moves from left to right
  const revealMaskStyle = useAnimatedStyle(() => {
    return {
      width: `${revealWidth.value}%`,
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
        {/* Background text (grey) - always visible */}
        <Text style={styles.backgroundText}>VOLCANO</Text>
        
        {/* Foreground text (black) with left-to-right reveal */}
        <View style={styles.foregroundContainer}>
          <Animated.View style={[styles.revealMask, revealMaskStyle]}>
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
  },
  foregroundContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  revealMask: {
    height: '100%',
    overflow: 'hidden',
  },
  gradientText: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
