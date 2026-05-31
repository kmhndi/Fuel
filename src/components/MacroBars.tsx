import { StyleSheet, Text, View } from 'react-native';
import { macroColors } from '../nutrition';
import { colors, font, radius, spacing } from '../theme';

interface MacroBarsProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}

/** Three labeled progress bars showing macro grams against their goals. */
export function MacroBars({
  protein,
  carbs,
  fat,
  proteinGoal,
  carbGoal,
  fatGoal,
}: MacroBarsProps) {
  return (
    <View style={styles.container}>
      <Bar label="Protein" value={protein} goal={proteinGoal} color={macroColors.protein} />
      <Bar label="Carbs" value={carbs} goal={carbGoal} color={macroColors.carbs} />
      <Bar label="Fat" value={fat} goal={fatGoal} color={macroColors.fat} />
    </View>
  );
}

function Bar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(value)}
          <Text style={styles.goal}> / {goal} g</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  value: {
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  goal: {
    color: colors.textMuted,
    fontWeight: font.weight.regular,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
