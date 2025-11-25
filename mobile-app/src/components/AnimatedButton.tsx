import React from 'react';
import { Pressable, Text, StyleSheet, Platform, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

export default function AnimatedButton({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  icon,
  iconPosition = 'left',
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.95, { damping: 15 });
    glowOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15 });
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return ['#3B82F6', '#8B5CF6'];
      case 'secondary':
        return ['#10B981', '#06B6D4'];
      case 'danger':
        return ['#EF4444', '#F97316'];
      default:
        return ['#3B82F6', '#8B5CF6'];
    }
  };

  const colors = getColors();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={styles.container}
    >
      <Animated.View style={[styles.buttonContainer, animatedStyle]}>
        {/* Glow effect */}
        <Animated.View style={[styles.glow, glowStyle]}>
          <LinearGradient
            colors={[...colors, colors[0]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.glowGradient}
          />
        </Animated.View>

        {/* Button */}
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            disabled && styles.buttonDisabled,
          ]}
        >
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon as any} size={20} color="#FFFFFF" style={styles.icon} />
          )}
          <Text style={[
            styles.buttonText,
            disabled && styles.buttonTextDisabled,
          ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon as any} size={20} color="#FFFFFF" style={styles.icon} />
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonContainer: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
    opacity: 0.6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    // Icon styling
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },
});

