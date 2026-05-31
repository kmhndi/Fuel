import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const PIECES = 28;
const PALETTE = [colors.accent, '#FBBF24', '#60A5FA', '#F472B6', '#38BDF8'];

interface Piece {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
}

/**
 * A brief confetti burst overlaid on the screen. Mount it with `show` true to
 * play once; it calls `onDone` when finished so the parent can unmount it.
 * Purely decorative and non-interactive (pointerEvents none).
 */
export function Celebration({
  show,
  onDone,
}: {
  show: boolean;
  onDone?: () => void;
}) {
  const { width, height } = Dimensions.get('window');
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECES }).map(() => ({
        left: Math.random() * width,
        size: 6 + Math.random() * 8,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        delay: Math.random() * 250,
        duration: 1100 + Math.random() * 900,
        rotate: Math.random() * 360,
      })),
    [width],
  );

  useEffect(() => {
    if (!show) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => onDone?.());
  }, [show, progress, onDone]);

  if (!show) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height + 40],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [`${p.rotate}deg`, `${p.rotate + 540}deg`],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              borderRadius: 2,
              opacity,
              transform: [{ translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
