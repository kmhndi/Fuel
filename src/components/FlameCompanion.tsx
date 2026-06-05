import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { successFeedback } from '../haptics';
import { colors } from '../theme';

interface Tier {
  /** Glyph size multiplier — the flame literally grows with the streak. */
  scale: number;
  /** Flame color, warming from amber toward red as the streak climbs. */
  color: string;
  /** Glow strength (0..1) for the soft halo. */
  glow: number;
}

/**
 * How big and hot the flame burns for a given logging streak. A streak of 0
 * is a dim ember; longer streaks grow brighter and shift toward red.
 */
export function flameTier(streak: number): Tier {
  if (streak <= 0) return { scale: 0.82, color: colors.textMuted, glow: 0 };
  if (streak < 3) return { scale: 0.95, color: '#FBBF24', glow: 0.25 };
  if (streak < 7) return { scale: 1.05, color: '#FB923C', glow: 0.38 };
  if (streak < 14) return { scale: 1.16, color: '#F97316', glow: 0.5 };
  if (streak < 30) return { scale: 1.26, color: '#F2541B', glow: 0.62 };
  return { scale: 1.36, color: '#EF4444', glow: 0.78 };
}

/**
 * A small flame mascot that reflects the user's logging streak: it grows and
 * warms with the streak, breathes with a gentle idle flicker, and flares (with
 * a celebratory haptic) the moment today's calorie goal is reached.
 */
export function FlameCompanion({
  streak,
  goalHit,
  size = 20,
}: {
  streak: number;
  goalHit: boolean;
  size?: number;
}) {
  const tier = flameTier(streak);
  const iconSize = Math.round(size * tier.scale);
  // Stable footprint so the surrounding row doesn't reflow as the flame breathes.
  const box = Math.round(size * 1.4);

  const flicker = useRef(new Animated.Value(0)).current;
  const flare = useRef(new Animated.Value(1)).current;
  const prevGoalHit = useRef(goalHit);

  // Continuous, slightly irregular idle flicker.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0,
          duration: 820,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flicker]);

  // Flare once when the goal flips from unmet to met (not on remount/refocus).
  useEffect(() => {
    if (goalHit && !prevGoalHit.current) {
      flare.setValue(1);
      Animated.sequence([
        Animated.timing(flare, { toValue: 1.55, duration: 180, useNativeDriver: true }),
        Animated.spring(flare, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
      ]).start();
      successFeedback();
    }
    prevGoalHit.current = goalHit;
  }, [goalHit, flare]);

  const amp = 0.04 + 0.07 * tier.glow;
  const breathe = flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amp] });
  const scale = Animated.multiply(flare, breathe);
  const glowOpacity = flicker.interpolate({
    inputRange: [0, 1],
    outputRange: [tier.glow * 0.7, tier.glow],
  });

  return (
    <View style={[styles.box, { width: box, height: box }]}>
      {tier.glow > 0 ? (
        <Animated.View
          style={[
            styles.glow,
            {
              width: box,
              height: box,
              borderRadius: box / 2,
              backgroundColor: tier.color,
              opacity: glowOpacity,
              transform: [{ scale }],
            },
          ]}
        />
      ) : null}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name="flame" size={iconSize} color={tier.color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
});
