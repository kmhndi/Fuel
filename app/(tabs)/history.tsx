import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import { getDailyTotals } from '@/db/meals';
import { getDailyAdherence, getRecentAdherence } from '@/db/supplements';
import { getWaterTotals } from '@/db/water';
import { getLatestWeight } from '@/db/weights';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { Card, EmptyState, SegmentedControl } from '@/components/ui';
import { kgToDisplay } from '@/health';
import { movingAverage } from '@/stats';
import { macroColors } from '@/nutrition';
import { tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { WeightEntry } from '@/types';

type Range = '7' | '14' | '30';

export default function TrendsScreen() {
  const { t: tr } = useT();
  const router = useRouter();
  const { goals } = useGoals();
  const [range, setRange] = useState<Range>('14');
  const [totals, setTotals] = useState<{ day: string; calories: number; protein: number }[]>([]);
  const [adherence, setAdherence] = useState({ taken: 0, possible: 0 });
  const [dots, setDots] = useState<{ day: string; taken: number; total: number }[]>([]);
  const [water, setWater] = useState<{ day: string; glasses: number }[]>([]);
  const [weight, setWeight] = useState<WeightEntry | null>(null);

  const days = Number(range);

  const reload = useCallback(() => {
    getDailyTotals(days).then(setTotals);
    getRecentAdherence(days).then(setAdherence);
    getDailyAdherence(Math.min(days, 30)).then(setDots);
    getWaterTotals(days).then(setWater);
    getLatestWeight().then(setWeight);
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const goal = goals.calorieGoal;
  const hasData = totals.length > 0;

  const maxCalories = Math.max(...totals.map((t) => t.calories), goal, 1);
  const avgCalories = hasData
    ? Math.round(totals.reduce((s, t) => s + t.calories, 0) / totals.length)
    : 0;
  const avgProtein = hasData
    ? Math.round(totals.reduce((s, t) => s + t.protein, 0) / totals.length)
    : 0;
  const onTargetDays = totals.filter((t) => t.calories > 0 && t.calories <= goal).length;
  const adherencePct =
    adherence.possible > 0 ? Math.round((adherence.taken / adherence.possible) * 100) : 0;
  const avgWater = water.length > 0
    ? (water.reduce((s, w) => s + w.glasses, 0) / water.length).toFixed(1)
    : '0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SegmentedControl<Range>
        value={range}
        onChange={(r) => {
          tapFeedback();
          setRange(r);
        }}
        options={[
          { value: '7', label: tr('trends.days', { n: 7 }) },
          { value: '14', label: tr('trends.days', { n: 14 }) },
          { value: '30', label: tr('trends.days', { n: 30 }) },
        ]}
      />

      {!hasData ? (
        <EmptyState
          icon={<Ionicons name="stats-chart-outline" size={40} color={colors.textMuted} />}
          title={tr('trends.noHistory')}
          subtitle={tr('trends.noHistorySub')}
        />
      ) : (
        <>
          <View style={styles.statsRow}>
            <Stat label={tr('trends.avgDay')} value={avgCalories.toLocaleString()} unit={tr('common.kcal')} />
            <Stat label={tr('trends.onTarget')} value={`${onTargetDays}`} unit={`/ ${totals.length}`} />
          </View>
          <View style={styles.statsRow}>
            <Stat label={tr('trends.avgProtein')} value={`${avgProtein}`} unit="g" accent={macroColors.protein} />
            <Stat label={tr('trends.avgWater')} value={avgWater} unit={tr('trends.glasses')} accent="#38BDF8" />
          </View>

          <Card>
            <Text style={styles.chartTitle}>{tr('trends.caloriesTitle', { n: totals.length })}</Text>
            <Text style={styles.chartLegend}>
              {tr('trends.caloriesLegend', { goal: goal.toLocaleString() })}
            </Text>
            <View style={styles.plot}>
              <View
                pointerEvents="none"
                style={[styles.goalLine, { bottom: `${(goal / maxCalories) * 100}%` }]}
              />
              {totals.map((t) => (
                <View key={t.day} style={styles.barColumn}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.round((t.calories / maxCalories) * 100)}%`,
                        backgroundColor: t.calories > goal ? colors.warning : colors.accent,
                      },
                    ]}
                  />
                </View>
              ))}
              {totals.length >= 3 ? (
                <Svg
                  style={StyleSheet.absoluteFill}
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${totals.length} 100`}
                  pointerEvents="none"
                >
                  <Polyline
                    points={movingAverage(totals.map((t) => t.calories), 7)
                      .map((v, i) => (v == null ? null : `${i + 0.5},${100 - (v / maxCalories) * 100}`))
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke={colors.text}
                    strokeWidth={0.6}
                    strokeOpacity={0.55}
                  />
                </Svg>
              ) : null}
            </View>
            <Text style={styles.maLegend}>{tr('trends.maLegend')}</Text>
          </Card>

          {dots.some((d) => d.total > 0) ? (
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.chartTitle}>{tr('trends.adherence')}</Text>
                <Text style={styles.adherencePct}>{adherencePct}%</Text>
              </View>
              <View style={styles.dots}>
                {dots.map((d) => {
                  const ratio = d.total > 0 ? d.taken / d.total : 0;
                  const color =
                    ratio >= 1 ? colors.accent : ratio > 0 ? colors.warning : colors.surfaceAlt;
                  return <View key={d.day} style={[styles.dot, { backgroundColor: color }]} />;
                })}
              </View>
            </Card>
          ) : null}

          <Pressable
            onPress={() => router.push('/weight')}
            style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
          >
            <Ionicons name="scale-outline" size={22} color={colors.accent} />
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>{tr('trends.weight')}</Text>
              <Text style={styles.linkSub}>
                {weight
                  ? `${kgToDisplay(weight.kg, goals.weightUnit).toFixed(1)} ${goals.weightUnit}`
                  : tr('trends.notLogged')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </>
      )}
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
        <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs },
  statLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  statValue: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold },
  statUnit: { color: colors.textMuted, fontSize: font.size.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chartTitle: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  adherencePct: { color: colors.accent, fontSize: font.size.md, fontWeight: font.weight.bold },
  chartLegend: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  plot: { flexDirection: 'row', alignItems: 'flex-end', height: 170, gap: spacing.xs },
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
  barFill: { width: '100%', borderRadius: radius.sm, minHeight: 2 },
  maLegend: { color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.sm },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 4 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  linkInfo: { flex: 1 },
  linkTitle: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  linkSub: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
});
