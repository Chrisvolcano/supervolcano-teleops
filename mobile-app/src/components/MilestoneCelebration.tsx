/**
 * MILESTONE CELEBRATION COMPONENT
 * Full-screen celebration overlay with confetti, mascot, animations
 * ADHD-friendly messaging - validating, not performative
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';

const MascotImage = require('../../assets/mascot/volcanomascotstill.png');
const { width } = Dimensions.get('window');

// Milestone definitions - ADHD-friendly messages
export const MILESTONES: Record<number, {
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  confettiCount: number;
}> = {
  60: { title: '1 MINUTE', message: "You started. That's the hardest part.", icon: 'checkmark-circle', confettiCount: 30 },
  300: { title: '5 MINUTES', message: "Five minutes in. You're doing it.", icon: 'flash', confettiCount: 50 },
  600: { title: '10 MINUTES', message: 'Momentum is building.', icon: 'trending-up', confettiCount: 80 },
  1800: { title: '30 MINUTES', message: 'Half an hour. Genuinely impressive.', icon: 'star', confettiCount: 120 },
  3600: { title: '1 HOUR', message: "You're unstoppable.", icon: 'trophy', confettiCount: 200 },
  5400: { title: '90 MINUTES', message: 'Legend status unlocked.', icon: 'medal', confettiCount: 200 },
  7200: { title: '2 HOURS', message: 'Incredible! Time for a break?', icon: 'cafe', confettiCount: 250 },
};

interface Props {
  milestone: number;
  totalHours: number;
  goalHours?: number;
  onDismiss: () => void;
  onTakeBreak?: () => void;
}

export const MilestoneCelebration: React.FC<Props> = ({
  milestone, totalHours, goalHours = 10, onDismiss, onTakeBreak
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const mascotAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);
  
  const milestoneData = MILESTONES[milestone] || {
    title: `${Math.floor(milestone / 60)} MINUTES`,
    message: 'Keep going!',
    icon: 'star' as const,
    confettiCount: 50,
  };

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => confettiRef.current?.start(), 200);
    
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(mascotAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start();
    
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 500);
  }, []);

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
      )}
      
      <ConfettiCannon
        ref={confettiRef}
        count={milestoneData.confettiCount}
        origin={{ x: width / 2, y: -20 }}
        autoStart={false}
        fadeOut
        explosionSpeed={400}
        fallSpeed={2500}
        colors={['#10B981', '#34D399', '#6EE7B7', '#FCD34D', '#FBBF24', '#F59E0B']}
      />
      
      <View style={styles.content}>
        <Animated.View style={[styles.mascotContainer, {
          transform: [
            { scale: mascotAnim },
            { translateY: mascotAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }
          ]
        }]}>
          <View style={styles.mascotCircle}>
            <Image source={MascotImage} style={styles.mascotImage} resizeMode="contain" />
          </View>
        </Animated.View>
        
        <Animated.View style={[styles.iconBadge, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.iconGradient}>
            <Ionicons name={milestoneData.icon} size={28} color="#fff" />
          </LinearGradient>
        </Animated.View>
        
        <Animated.Text style={[styles.title, { opacity: scaleAnim }]}>{milestoneData.title}</Animated.Text>
        <View style={styles.divider} />
        <Text style={styles.message}>{milestoneData.message}</Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleDismiss} activeOpacity={0.8}>
          <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
            <Text style={styles.primaryButtonText}>Keep Going</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
        
        {milestone >= 7200 && onTakeBreak && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onTakeBreak}>
            <Ionicons name="cafe-outline" size={18} color="#6B7280" />
            <Text style={styles.secondaryButtonText}>Take a break</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((totalHours / goalHours) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{totalHours.toFixed(1)} / {goalHours} hours toward free clean</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  content: { alignItems: 'center', paddingHorizontal: 32, maxWidth: 400 },
  mascotContainer: { marginBottom: 24 },
  mascotCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(251, 191, 36, 0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mascotImage: { width: 80, height: 80 },
  iconBadge: { marginBottom: 16 },
  iconGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  title: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: 2, textAlign: 'center', marginBottom: 8 },
  divider: { width: 60, height: 4, backgroundColor: '#10B981', borderRadius: 2, marginVertical: 16 },
  message: { fontSize: 18, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 26, marginBottom: 32 },
  primaryButton: { width: '100%', borderRadius: 16, overflow: 'hidden', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 32 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8, marginTop: 12 },
  secondaryButtonText: { color: '#6B7280', fontSize: 16 },
  progressContainer: { marginTop: 32, width: '100%', alignItems: 'center' },
  progressBar: { width: '80%', height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
  progressText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' },
});

export default MilestoneCelebration;

