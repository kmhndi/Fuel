import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDailyTotals } from '@/db/meals';
import { formatDayLabel } from '@/db/dates';
import { Card, EmptyState } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';

const DAYS = 14;

export default function HistoryScreen() {
  const [totals, setTotals] = useState<{ day: string; total: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      getDailyTotals(DAYS).then(setTotals);
    }, []),
  );

  if (totals.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={<Ionicons name="stats-chart-outline" size={40} color={colors.textMuted} />}
          title="No history yet"
          subtitle="Once you log a few meals, your daily totals and trends will show up here."
        />
      </View>
    );
  }

  const max = Math.max(...totals.map((t) => t.total), 1);
  const average = Math.round(
    totals.reduce((sum, t) => sum + t.total, 0) / totals.length,
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>Daily average</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{average.toLocaleString()}</Text>
          <Text style={styles.summaryUnit}>kcal</Text>
        </View>
        <Text style={styles.summaryMeta}>
          Across {totals.length} {totals.length === 1 ? 'day' : 'days'}
        </Text>
      </Card>

      <Card>
        <Text style={styles.chartTitle}>Last {totals.length} days</Text>
        <View style={styles.chart}>
          {totals.map((t) => (
            <View key={t.day} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {t.total > 0 ? t.total.toLocaleString() : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${Math.round((t.total / max) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {shortLabel(t.day)}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

/** Compact axis label: weekday letter + day-of-month, e.g. "M 12". */
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
  summary: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryValue: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
  },
  summaryUnit: {
    color: colors.textMuted,
    fontSize: font.size.md,
    marginBottom: spacing.xs,
  },
  summaryMeta: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    marginTop: spacing.xs,
  },
  chartTitle: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    marginBottom: spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: spacing.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  barValue: {
    color: colors.textMuted,
    fontSize: 9,
  },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    minHeight: 2,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 9,
  },
});
