import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Design';

export function CelebrationAnimation({ onComplete }: { onComplete?: () => void }) {
  const particles = Array.from({ length: 12 }, (_, i) => i);
  const animations = useRef(
    particles.map(() => ({
      opacity: new Animated.Value(1),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const animationSequence = particles.map((i) => {
      const angle = (i / particles.length) * 360;
      const distance = 100;
      const x = Math.cos((angle * Math.PI) / 180) * distance;
      const y = Math.sin((angle * Math.PI) / 180) * distance;

      return Animated.parallel([
        Animated.timing(animations[i].opacity, {
          toValue: 0,
          duration: 1000,
          delay: i * 30,
          useNativeDriver: true,
        }),
        Animated.timing(animations[i].translateX, {
          toValue: x,
          duration: 1000,
          delay: i * 30,
          useNativeDriver: true,
        }),
        Animated.timing(animations[i].translateY, {
          toValue: y,
          duration: 1000,
          delay: i * 30,
          useNativeDriver: true,
        }),
        Animated.spring(animations[i].scale, {
          toValue: 1,
          delay: i * 30,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(animations[i].rotate, {
          toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
          duration: 1000,
          delay: i * 30,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animationSequence).start(() => {
      if (onComplete) onComplete();
    });
  }, []);

  const iconNames = ['sparkles', 'star', 'flash', 'trophy', 'heart'];

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((i) => {
        const iconName = iconNames[i % iconNames.length] as any;
        const rotateInterpolate = animations[i].rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                opacity: animations[i].opacity,
                transform: [
                  { translateX: animations[i].translateX },
                  { translateY: animations[i].translateY },
                  { scale: animations[i].scale },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            <Ionicons name={iconName} size={24} color={Colors.primary} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  particle: {
    position: 'absolute',
  },
});
