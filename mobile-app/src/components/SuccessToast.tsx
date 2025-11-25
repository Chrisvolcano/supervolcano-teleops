import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface SuccessToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
}

export default function SuccessToast({ message, show, onClose }: SuccessToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50);
  const scale = useSharedValue(0.9);
  const iconScale = useSharedValue(0);

  useEffect(() => {
    if (show) {
      // Animate in
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      scale.value = withSpring(1, { damping: 15, stiffness: 100 });
      // Delay icon animation using setTimeout
      setTimeout(() => {
        iconScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }, 100);

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        animateOut();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      animateOut();
    }
  }, [show]);

  const animateOut = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-20, { duration: 200 });
    scale.value = withTiming(0.9, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  if (!show) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['#22c55e', '#16a34a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Animated.View style={iconStyle}>
          <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
        </Animated.View>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={animateOut} style={styles.closeButton}>
          <Ionicons name="close" size={16} color="#ffffff" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    left: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
    borderRadius: 4,
  },
});

