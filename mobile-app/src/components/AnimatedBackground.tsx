import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function AnimatedBackground() {
  const wave1Offset = useSharedValue(0);
  const wave2Offset = useSharedValue(0);
  const wave3Offset = useSharedValue(0);

  useEffect(() => {
    // Slow, infinite wave animations with different speeds
    wave1Offset.value = withRepeat(
      withTiming(width, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    wave2Offset.value = withRepeat(
      withTiming(width, {
        duration: 15000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    wave3Offset.value = withRepeat(
      withTiming(width, {
        duration: 25000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const wave1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -wave1Offset.value }],
  }));

  const wave2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -wave2Offset.value }],
  }));

  const wave3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -wave3Offset.value }],
  }));

  return (
    <Animated.View style={styles.container}>
      {/* Subtle gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(59, 130, 246, 0.03)', // blue-500 with 3% opacity
          'rgba(147, 51, 234, 0.02)', // purple-600 with 2% opacity
          'rgba(236, 72, 153, 0.02)', // pink-500 with 2% opacity
        ]}
        style={styles.gradient}
      />

      {/* Wave 1 - Bottom */}
      <Animated.View style={[styles.waveContainer, wave1Style]}>
        <Svg height="100%" width={width * 2} style={styles.wave}>
          <Defs>
            <SvgGradient id="wave1" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(59, 130, 246, 0.05)" />
              <Stop offset="1" stopColor="rgba(59, 130, 246, 0.01)" />
            </SvgGradient>
          </Defs>
          <Path
            d={`M0,${height * 0.7} Q${width * 0.5},${height * 0.6} ${width},${height * 0.7} T${width * 2},${height * 0.7} V${height} H0 Z`}
            fill="url(#wave1)"
          />
        </Svg>
      </Animated.View>

      {/* Wave 2 - Middle */}
      <Animated.View style={[styles.waveContainer, wave2Style]}>
        <Svg height="100%" width={width * 2} style={styles.wave}>
          <Defs>
            <SvgGradient id="wave2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(147, 51, 234, 0.04)" />
              <Stop offset="1" stopColor="rgba(147, 51, 234, 0.01)" />
            </SvgGradient>
          </Defs>
          <Path
            d={`M0,${height * 0.75} Q${width * 0.5},${height * 0.65} ${width},${height * 0.75} T${width * 2},${height * 0.75} V${height} H0 Z`}
            fill="url(#wave2)"
          />
        </Svg>
      </Animated.View>

      {/* Wave 3 - Top */}
      <Animated.View style={[styles.waveContainer, wave3Style]}>
        <Svg height="100%" width={width * 2} style={styles.wave}>
          <Defs>
            <SvgGradient id="wave3" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(236, 72, 153, 0.03)" />
              <Stop offset="1" stopColor="rgba(236, 72, 153, 0.01)" />
            </SvgGradient>
          </Defs>
          <Path
            d={`M0,${height * 0.8} Q${width * 0.5},${height * 0.7} ${width},${height * 0.8} T${width * 2},${height * 0.8} V${height} H0 Z`}
            fill="url(#wave3)"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width * 2,
    height: height,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
  },
});

