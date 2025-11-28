import React from 'react';
import { Pressable, Text, StyleSheet, Platform, View } from 'react-native';
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
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <View style={styles.buttonContainer}>
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
      </View>
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

