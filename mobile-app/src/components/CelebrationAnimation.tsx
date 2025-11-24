import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Design';

export function CelebrationAnimation({ onComplete }: { onComplete?: () => void }) {
  const iconNames = ['sparkles', 'star', 'flash', 'trophy', 'heart'];
  const particles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((i) => {
        const iconName = iconNames[i % iconNames.length] as any;
        const angle = (i / particles.length) * 360;
        const distance = 150 + Math.random() * 100;
        const x = Math.cos(angle * Math.PI / 180) * distance;
        const y = Math.sin(angle * Math.PI / 180) * distance;

        return (
          <MotiView
            key={i}
            from={{
              opacity: 1,
              translateX: 0,
              translateY: 0,
              scale: 0,
              rotate: '0deg',
            }}
            animate={{
              opacity: 0,
              translateX: x,
              translateY: y,
              scale: 1,
              rotate: `${360 * (Math.random() > 0.5 ? 1 : -1)}deg`,
            }}
            transition={{
              type: 'timing',
              duration: 1000,
              delay: i * 20,
            }}
            onDidAnimate={() => {
              if (i === particles.length - 1 && onComplete) {
                onComplete();
              }
            }}
            style={styles.particle}
          >
            <Ionicons name={iconName} size={20} color={Colors.primary} />
          </MotiView>
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
  },
  particle: {
    position: 'absolute',
  },
});

