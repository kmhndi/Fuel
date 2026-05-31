import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGoals, saveGoals } from '@/db/settings';
import { getLatestWeight } from '@/db/weights';
import { useGoals } from '@/state/GoalsContext';
import { Card, Field, SegmentedControl } from '@/components/ui';
import {
  ACTIVITY_LEVELS,
  displayToKg,
  goalTargets,
  kgToDisplay,
  tdee,
} from '@/health';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Sex } from '@/types';

export default function GoalCalculatorScreen() {
  const router = useRouter();
  const { goals, refresh } = useGoals();
  const unit = goals.weightUnit;

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState(1.2);

  useEffect(() => {
    getGoals().then((g) => {
      if (g.sex) setSex(g.sex);
      if (g.age) setAge(String(g.age));
      if (g.heightCm) setHeight(String(Math.round(g.heightCm)));
      setActivity(g.activity);
    });
    getLatestWeight().then((w) => {
      if (w) setWeight(kgToDisplay(w.kg, unit).toFixed(1));
    });
  }, [unit]);

  const num = (s: string) => {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const weightKg = weight ? displayToKg(num(weight), unit) : null;
  const result = tdee(sex, num(age) || null, num(height) || null, weightKg, activity);
  const targets = result ? goalTargets(result) : null;

  const apply = async (calorieGoal: number) => {
    await saveGoals({
      calorieGoal,
      sex,
      age: num(age) || null,
      heightCm: num(height) || null,
      activity,
    });
    await refresh();
    successFeedback();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Estimate your daily calorie burn with the Mifflin-St Jeor formula, then
          pick a target.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.label}>Sex</Text>
          <SegmentedControl<Sex>
            value={sex}
            onChange={setSex}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
          <View style={styles.row}>
            <View style={styles.cell}>
              <Field label="Age" value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="yr" />
            </View>
            <View style={styles.cell}>
              <Field label="Height" value={height} onChangeText={(t) => setHeight(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="cm" />
            </View>
            <View style={styles.cell}>
              <Field label="Weight" value={weight} onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={unit} />
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Activity level</Text>
          {ACTIVITY_LEVELS.map((lvl) => {
            const active = lvl.value === activity;
            return (
              <Pressable
                key={lvl.value}
                onPress={() => {
                  selectionFeedback();
                  setActivity(lvl.value);
                }}
                style={({ pressed }) => [
                  styles.activity,
                  active && styles.activityActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityLabel, active && { color: colors.accent }]}>
                    {lvl.label}
                  </Text>
                  <Text style={styles.activityHint}>{lvl.hint}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </Card>

        {targets ? (
          <Card style={styles.card}>
            <Text style={styles.tdee}>
              Maintenance ≈ {result!.toLocaleString()} kcal/day
            </Text>
            <TargetRow label="Lose weight" sub="−500 kcal" value={targets.lose} onPress={() => apply(targets.lose)} />
            <TargetRow label="Maintain" sub="match burn" value={targets.maintain} onPress={() => apply(targets.maintain)} />
            <TargetRow label="Gain weight" sub="+300 kcal" value={targets.gain} onPress={() => apply(targets.gain)} />
          </Card>
        ) : (
          <Text style={styles.fillHint}>Fill in age, height and weight to see your estimate.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TargetRow({
  label,
  sub,
  value,
  onPress,
}: {
  label: string;
  sub: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.target, pressed && { opacity: 0.8 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.targetLabel}>{label}</Text>
        <Text style={styles.targetSub}>{sub}</Text>
      </View>
      <Text style={styles.targetValue}>{value.toLocaleString()}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  lead: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  card: { gap: spacing.md },
  label: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activityActive: { borderColor: colors.accent },
  activityLabel: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  activityHint: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  tdee: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  targetLabel: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  targetSub: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  targetValue: { color: colors.accent, fontSize: font.size.lg, fontWeight: font.weight.bold },
  fillHint: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center', marginTop: spacing.lg },
});
