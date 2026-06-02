import { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The app's backdrop: a vertical indigo→deep-space gradient with a faint static
 * starfield. Rendered once at the root behind the navigator; screens are
 * transparent so this shows through everywhere. Non-interactive.
 */
export function ScreenBackground({ stars = true }: { stars?: boolean }) {
  const { width, height } = Dimensions.get('window');

  // Generated once per session — stable across re-renders.
  const dots = useMemo(
    () =>
      Array.from({ length: 28 }).map(() => ({
        cx: Math.random() * width,
        cy: Math.random() * height,
        r: 0.6 + Math.random() * 0.9,
        o: 0.04 + Math.random() * 0.07,
      })),
    [width, height],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {stars ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {dots.map((d, i) => (
            <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#FFFFFF" opacity={d.o} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
