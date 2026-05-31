import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDailyTotals } from '@/db/meals';
import { getRecentAdherence } from '@/db/supplements';
import { formatDayLabel } from '@/db/dates';
import { useGoals } from '@/state/GoalsContext';
import { Card, EmptyState } from '@/components/ui';
import { macroColors } from '@/nutrition';
import { colors, font, radius, spacing } from '@/theme';

const DAYS = 14;

interface DayTotal {
  day: string;
  calories: number;
  protein: number;
}

export default function HistoryScreen() {
  const { goals } = useGoals();
  const [totals, setTotals] = useState<DayTotal[]>([]);
  const [adherence, setAdherence] = useState({ taken: 0, possible: 0 });

  useFocusEffect(
    useCallback(() => {
      getDailyTotals(DAYS).then(setTotals);
      getRecentAdherence(DAYS).then(setAdherence);
    }, []),
  );

  if (totals.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={
            <Ionicons name="stats-chart-outline" size={40} color={colors.textMuted} />
          }
          title="No history yet"
          subtitle="Once you log a few meals, your daily totals and trends will show up here."
        />
      </View>
    );
  }

  const goal = goals.calorieGoal;
  const maxCalories = Math.max(...totals.map((t) => t.calories), goal, 1);
  const avgCalories = Math.round(
    totals.reduce((sum, t) => sum + t.calories, 0) / totals.length,
  );
  const avgProtein = Math.round(
    totals.reduce((sum, t) => sum + t.protein, 0) / totals.length,
  );
  const onTargetDays = totals.filter(
    (t) => t.calories > 0 && t.calories <= goal,
  ).length;
  const adherencePct =
    adherence.possible > 0
      ? Math.round((adherence.taken / adherence.possible) * 100)
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        <Stat label="Avg / day" value={avgCalories.toLocaleString()} unit="kcal" />
        <Stat
          label="On target"
          value={`${onTargetDays}`}
          unit={`/ ${totals.length} days`}
        />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Avg protein" value={`${avgProtein}`} unit="g" accent={macroColors.protein} />
        <Stat label="Supplements" value={`${adherencePct}%`} unit="taken" />
      </View>

      <Card>
        <Text style={styles.chartTitle}>Calories · last {totals.length} days</Text>
        <Text style={styles.chartLegend}>
          Goal {goal.toLocaleString()} kcal · bars turn amber when over
        </Text>
        {/* Plot area: bars + goal line share the same coordinate space. */}
        <View style={styles.plot}>
          <View
            pointerEvents="none"
            style={[styles.goalLine, { bottom: `${(goal / maxCalories) * 100}%` }]}
          />
          {totals.map((t) => {
            const over = t.calories > goal;
            return (
              <View key={t.day} style={styles.barColumn}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.round((t.calories / maxCalories) * 100)}%`,
                      backgroundColor: over ? colors.warning : colors.accent,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
        {/* Axis labels, mirroring the plot's columns. */}
        <View style={styles.labelsRow}>
          {totals.map((t) => (
            <Text key={t.day} style={styles.barLabel} numberOfLines={1}>
              {shortLabel(t.day)}
            </Text>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: string;
}) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, accent ? { color: accent } : null]}>
          {value}
        </Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </Card>
  );
}

/** Compact axis label, e.g. "Today", "Yest", or "5/12". */
function shortLabel(dayKey: string): string {
  const full = formatDayLabel(dayKey);
  if (full === 'Today') return 'Today';
  if (full === 'Yesterday') return 'Yest';
  const [, m, d] = dayKey.split('-');
  return `${Number(m)}/${Number(d)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statValue: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
  },
  statUnit: {
    color: colors.textMuted,
    fontSize: font.size.sm,
  },
  chartTitle: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  chartLegend: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 170,
    gap: spacing.xs,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.sm,
    minHeight: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  barLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
});
