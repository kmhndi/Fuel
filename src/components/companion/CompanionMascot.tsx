import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { flameTier } from '@/components/FlameCompanion';
import { selectionFeedback, successFeedback } from '@/haptics';
import { isRTL } from '@/i18n';
import { radius } from '@/theme';
import { CompanionFigure } from './CompanionFigure';
import type { CharacterId } from './characters';
import type { CompanionMood } from './mood';

// Square footprint for the PNG art.
const SIZE = 112;
// The tab header already absorbs the status bar; this clears the DateBar row so
// the creature peeks in just below it (and never over the prev/next chevrons).
const TOP = 44;

export interface CompanionMascotProps {
  character: CharacterId;
  /** Resting frame / expression. */
  mood: CompanionMood;
  /** Drives the streak badge (hidden at 0). */
  streak: number;
  /** Edge-triggered celebrate reaction when today's goal flips to met. */
  goalHit: boolean;
  onPress?: () => void;
}

/**
 * The home-screen companion: a creature that peeks in from the top-right edge,
 * breathes/sways, celebrates a goal-hit, and reacts to a tap. Rendered as an
 * absolute overlay; `box-none` + a small hotspot keep the DateBar chevrons and
 * list scrolling underneath fully usable.
 */
export function CompanionMascot({ character, mood, streak, goalHit, onPress }: CompanionMascotProps) {
  const idle = useRef(new Animated.Value(0)).current;
  const peek = useRef(new Animated.Value(0)).current;
  const celebrate = useRef(new Animated.Value(1)).current;
  const tap = useRef(new Animated.Value(1)).current;
  const prevGoalHit = useRef(goalHit);

  // Gentle, continuous breathe + sway.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [idle]);

  // Slide in from off the edge on mount.
  useEffect(() => {
    Animated.spring(peek, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [peek]);

  // Pop once when the goal flips from unmet to met (not on remount/refocus).
  useEffect(() => {
    if (goalHit && !prevGoalHit.current) {
      celebrate.setValue(1);
      Animated.sequence([
        Animated.timing(celebrate, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.spring(celebrate, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
      ]).start();
      successFeedback();
    }
    prevGoalHit.current = goalHit;
  }, [goalHit, celebrate]);

  const handlePress = () => {
    selectionFeedback();
    tap.setValue(1);
    Animated.sequence([
      Animated.timing(tap, { toValue: 0.9, duration: 90, useNativeDriver: true }),
      Animated.spring(tap, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  const startX = (SIZE + 20) * (isRTL ? -1 : 1);
  const translateX = peek.interpolate({ inputRange: [0, 1], outputRange: [startX, 0] });
  const translateY = idle.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const rotate = idle.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] });
  const scale = Animated.multiply(celebrate, tap);

  return (
    <View pointerEvents="box-none" style={[styles.container, isRTL ? { left: 0 } : { right: 0 }]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.figureWrap, { opacity: peek, transform: [{ translateX }, { translateY }, { rotate }, { scale }] }]}
      >
        <View pointerEvents="none" style={isRTL ? styles.mirror : undefined}>
          <CompanionFigure character={character} mood={mood} width={SIZE} />
        </View>

        <Pressable
          onPress={handlePress}
          style={styles.hotspot}
          accessibilityRole="button"
          accessibilityLabel={`Companion${streak >= 1 ? `, ${streak} day streak` : ''}`}
        />

        {streak >= 1 ? (
          <View
            pointerEvents="none"
            style={[styles.badge, isRTL ? { right: 4 } : { left: 4 }, { backgroundColor: flameTier(streak).color }]}
          >
            <Ionicons name="flash" size={10} color="#2A2438" />
            <Text style={styles.badgeText}>{streak}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: TOP, width: SIZE, height: SIZE + 16, zIndex: 10 },
  figureWrap: { width: SIZE, height: SIZE + 16 },
  mirror: { transform: [{ scaleX: -1 }] },
  hotspot: { position: 'absolute', top: SIZE * 0.1, left: SIZE * 0.12, width: SIZE * 0.76, height: SIZE * 0.72 },
  badge: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  badgeText: { color: '#2A2438', fontSize: 11, fontWeight: '800' },
});
