import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { addWeight, deleteWeight, getWeights } from '@/db/weights';
import { getLatestMeasurement, saveMeasurement } from '@/db/measurements';
import { toDayKey } from '@/db/dates';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { Card, EmptyState, Field, GhostButton, PrimaryButton } from '@/components/ui';
import { displayToKg, kgToDisplay } from '@/health';
import { movingAverage } from '@/stats';
import { successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { DayMeasurement, WeightEntry } from '@/types';

export default function WeightScreen() {
  const { goals } = useGoals();
  const { t: tr, formatDay } = useT();
  const unit = goals.weightUnit;
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [waist, setWaist] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [measurement, setMeasurement] = useState<DayMeasurement | null>(null);
  const [savingM, setSavingM] = useState(false);

  const load = useCallback(async () => {
    setEntries(await getWeights());
    const m = await getLatestMeasurement();
    setMeasurement(m);
    setWaist(m?.waistCm ? String(m.waistCm) : '');
    setBodyFat(m?.bodyFat ? String(m.bodyFat) : '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const value = Number.parseFloat(input);
  const canSave = Number.isFinite(value) && value > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await addWeight(displayToKg(value, unit));
    successFeedback();
    setInput('');
    setSaving(false);
    load();
  };

  const saveMeasurements = async () => {
    setSavingM(true);
    const w = Number.parseFloat(waist);
    const bf = Number.parseFloat(bodyFat);
    await saveMeasurement(
      toDayKey(),
      Number.isFinite(w) && w > 0 ? w : null,
      Number.isFinite(bf) && bf > 0 ? bf : null,
    );
    successFeedback();
    setSavingM(false);
    load();
  };

  const confirmDelete = (entry: WeightEntry) => {
    Alert.alert(tr('weight.deleteTitle'), tr('weight.deleteMsg', { day: formatDay(entry.day) }), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteWeight(entry.id);
          load();
        },
      },
    ]);
  };

  const latest = entries.at(-1) ?? null;
  const first = entries[0] ?? null;
  const changeKg = latest && first ? latest.kg - first.kg : 0;

  // Project time-to-goal from the recent rate of change.
  const goalKg = goals.goalWeightKg;
  let projection: string | null = null;
  if (latest && goalKg != null) {
    const remaining = goalKg - latest.kg;
    if (Math.abs(remaining) < 0.2) {
      projection = tr('weight.reached');
    } else if (entries.length >= 2) {
      const span = entries.slice(-8);
      const a = span[0];
      const b = span[span.length - 1];
      const days = Math.max(
        1,
        Math.round((new Date(b.day).getTime() - new Date(a.day).getTime()) / 86400000),
      );
      const ratePerDay = (b.kg - a.kg) / days;
      if (ratePerDay === 0 || Math.sign(ratePerDay) !== Math.sign(remaining)) {
        projection = tr('weight.notTrending');
      } else {
        const weeks = Math.max(1, Math.round(remaining / ratePerDay / 7));
        projection = weeks === 1 ? tr('weight.weekToGoal') : tr('weight.weeksToGoal', { n: weeks });
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {latest ? (
          <View style={styles.statsRow}>
            <Card style={styles.stat}>
              <Text style={styles.statLabel}>{tr('weight.current')}</Text>
              <Text style={styles.statValue}>
                {kgToDisplay(latest.kg, unit).toFixed(1)}
                <Text style={styles.statUnit}> {unit}</Text>
              </Text>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statLabel}>{tr('weight.sinceStart')}</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: changeKg > 0 ? colors.warning : colors.accent },
                ]}
              >
                {changeKg > 0 ? '+' : ''}
                {kgToDisplay(changeKg, unit).toFixed(1)}
                <Text style={styles.statUnit}> {unit}</Text>
              </Text>
            </Card>
          </View>
        ) : null}

        {goalKg != null ? (
          <Card style={styles.goalCard}>
            <Ionicons name="flag" size={18} color={colors.accent} />
            <Text style={styles.goalText}>
              {tr('weight.goalLine', { v: kgToDisplay(goalKg, unit).toFixed(1), unit })}
              {projection ? ` · ${projection}` : ''}
            </Text>
          </Card>
        ) : null}

        {entries.length >= 2 ? (
          <Card>
            <Text style={styles.chartTitle}>{tr('weight.trend')}</Text>
            <WeightChart entries={entries} unit={unit} />
          </Card>
        ) : null}

        <Card style={styles.logCard}>
          <Text style={styles.logLabel}>{tr('weight.logToday')}</Text>
          <View style={styles.logRow}>
            <View style={styles.inputWrap}>
              <TextInput
                value={input}
                onChangeText={(t) => setInput(t.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Text style={styles.inputUnit}>{unit}</Text>
            </View>
          </View>
          <PrimaryButton label={tr('weight.saveWeight')} onPress={save} disabled={!canSave} loading={saving} />
        </Card>

        <Card style={styles.logCard}>
          <Text style={styles.logLabel}>{tr('weight.measurements')}</Text>
          {measurement?.waistCm || measurement?.bodyFat ? (
            <Text style={styles.measureCurrent}>
              {measurement.waistCm ? `Waist ${measurement.waistCm} cm` : ''}
              {measurement.waistCm && measurement.bodyFat ? ' · ' : ''}
              {measurement.bodyFat ? `Body fat ${measurement.bodyFat}%` : ''}
            </Text>
          ) : null}
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Field label={tr('weight.waist')} value={waist} onChangeText={(v) => setWaist(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="cm" />
            </View>
            <View style={styles.measureCell}>
              <Field label={tr('weight.bodyFat')} value={bodyFat} onChangeText={(v) => setBodyFat(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="%" />
            </View>
          </View>
          <GhostButton label={savingM ? tr('weight.savingDots') : tr('weight.saveMeasurements')} onPress={saveMeasurements} />
        </Card>

        {entries.length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.historyLabel}>{tr('weight.history')}</Text>
            {[...entries].reverse().map((entry) => (
              <Pressable
                key={entry.id}
                onLongPress={() => confirmDelete(entry)}
                style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
              >
                <Text style={styles.entryDay}>{formatDay(entry.day)}</Text>
                <Text style={styles.entryValue}>
                  {kgToDisplay(entry.kg, unit).toFixed(1)} {unit}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.hint}>{tr('weight.longPressDelete')}</Text>
          </View>
        ) : (
          <EmptyState
            icon={<Ionicons name="scale-outline" size={40} color={colors.textMuted} />}
            title={tr('weight.noWeighins')}
            subtitle={tr('weight.noWeighinsSub')}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Simple SVG line chart of weight over time. */
function WeightChart({ entries, unit }: { entries: WeightEntry[]; unit: string }) {
  const width = 300;
  const height = 140;
  const pad = 12;

  const values = entries.map((e) => e.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toXY = (kg: number, i: number) => ({
    x: pad + (i / (entries.length - 1)) * (width - pad * 2),
    y: pad + (1 - (kg - min) / range) * (height - pad * 2),
  });
  const points = entries.map((e, i) => toXY(e.kg, i));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  // 5-point trailing average, drawn as a faint smoothing line.
  const avg = movingAverage(values, 5);
  const avgLine = avg
    .map((v, i) => (v == null ? null : toXY(v, i)))
    .filter((p): p is { x: number; y: number } => p !== null)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline
          points={avgLine}
          fill="none"
          stroke={colors.textMuted}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
        <Polyline
          points={polyline}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={colors.accent} />
        ))}
      </Svg>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>
          {kgToDisplay(max, unit as 'kg' | 'lb').toFixed(1)} {unit}
        </Text>
        <Text style={styles.axisLabel}>
          {kgToDisplay(min, unit as 'kg' | 'lb').toFixed(1)} {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs },
  statLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold },
  statUnit: { color: colors.textMuted, fontSize: font.size.md, fontWeight: font.weight.regular },
  chartTitle: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    marginBottom: spacing.md,
  },
  chartWrap: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  chartAxis: { justifyContent: 'space-between', paddingVertical: spacing.sm },
  axisLabel: { color: colors.textMuted, fontSize: 10 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalText: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium, flex: 1 },
  logCard: { gap: spacing.md },
  logLabel: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  measureCurrent: { color: colors.textMuted, fontSize: font.size.sm },
  measureRow: { flexDirection: 'row', gap: spacing.sm },
  measureCell: { flex: 1 },
  logRow: { flexDirection: 'row' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  input: { flex: 1, paddingVertical: spacing.md, color: colors.text, fontSize: font.size.xl },
  inputUnit: { color: colors.textMuted, fontSize: font.size.md },
  history: { gap: spacing.sm },
  historyLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  entryDay: { color: colors.text, fontSize: font.size.md },
  entryValue: { color: colors.accent, fontSize: font.size.md, fontWeight: font.weight.semibold },
  hint: { color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.xs },
});
