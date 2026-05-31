import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';
import { tapFeedback } from '../haptics';
import { colors, font, radius, spacing } from '../theme';

const WATER_BLUE = '#38BDF8';

/**
 * Daily water tracker: a row of glass icons that fill as you log, with
 * quick +/- controls. Shows total volume against the goal.
 */
export function WaterCard({
  glasses,
  goal,
  glassMl,
  onAdd,
  onRemove,
}: {
  glasses: number;
  goal: number;
  glassMl: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  // Cap the rendered icons so a very high goal doesn't overflow the row.
  const dotsToShow = Math.min(Math.max(goal, glasses), 12);
  const ml = glasses * glassMl;
  const goalMl = goal * glassMl;
  const met = glasses >= goal;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="water" size={18} color={WATER_BLUE} />
          <Text style={styles.title}>Water</Text>
        </View>
        <Text style={[styles.count, met && { color: WATER_BLUE }]}>
          {ml.toLocaleString()} / {goalMl.toLocaleString()} ml
        </Text>
      </View>

      <View style={styles.glasses}>
        {Array.from({ length: dotsToShow }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < glasses ? 'water' : 'water-outline'}
            size={22}
            color={i < glasses ? WATER_BLUE : colors.border}
          />
        ))}
        {glasses > 12 ? <Text style={styles.overflow}>+{glasses - 12}</Text> : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => {
            tapFeedback();
            onRemove();
          }}
          disabled={glasses === 0}
          style={({ pressed }) => [
            styles.stepper,
            glasses === 0 && styles.stepperDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Remove a glass"
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => {
            tapFeedback();
            onAdd();
          }}
          style={({ pressed }) => [styles.addGlass, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={colors.bg} />
          <Text style={styles.addGlassLabel}>Glass</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  count: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  glasses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  overflow: {
    color: WATER_BLUE,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    marginLeft: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  addGlass: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: WATER_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addGlassLabel: {
    color: colors.bg,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  pressed: {
    opacity: 0.8,
  },
});
