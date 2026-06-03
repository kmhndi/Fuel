import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { updateWidgetSnapshot } from '@/widgets';
import { getLatestWeight } from '@/db/weights';
import { useGoals } from '@/state/GoalsContext';
import {
  Card,
  Field,
  GhostButton,
  PrimaryButton,
  SegmentedControl,
} from '@/components/ui';
import {
  ACTIVITY_LEVELS,
  displayToKg,
  estimateTdee,
  kgToDisplay,
  targetFromPace,
  type GoalDirection,
} from '@/health';
import { caloriesFromMacros, suggestMacros, type ProteinPref } from '@/nutrition';
import { useT } from '@/i18n';
import type { TKey } from '@/i18n/translations';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Sex } from '@/types';

const ACTIVITY_I18N: Record<number, { label: TKey; hint: TKey }> = {
  1.2: { label: 'calc.sedentary', hint: 'calc.sedentaryH' },
  1.375: { label: 'calc.lightAct', hint: 'calc.lightActH' },
  1.55: { label: 'calc.moderate', hint: 'calc.moderateH' },
  1.725: { label: 'calc.active', hint: 'calc.activeH' },
  1.9: { label: 'calc.veryActive', hint: 'calc.veryActiveH' },
};

const PACE_OPTIONS = [250, 500, 750] as const;

interface Confirm {
  direction: GoalDirection;
  calorie: string;
  protein: string;
  carbs: string;
  fat: string;
}

export default function GoalCalculatorScreen() {
  const router = useRouter();
  const { goals, refresh } = useGoals();
  const { t } = useT();
  const unit = goals.weightUnit;

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [activity, setActivity] = useState(1.2);
  const [proteinPref, setProteinPref] = useState<ProteinPref>('maintain');
  const [pace, setPace] = useState<number>(500);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGoals().then((g) => {
      if (g.sex) setSex(g.sex);
      if (g.age) setAge(String(g.age));
      if (g.heightCm) setHeight(String(Math.round(g.heightCm)));
      if (g.goalWeightKg) setGoalWeight(kgToDisplay(g.goalWeightKg, unit).toFixed(1));
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
  const int = (s: string) => Math.max(0, Math.round(num(s)));

  const weightKg = weight ? displayToKg(num(weight), unit) : null;
  const bodyFatPct = bodyFat ? num(bodyFat) : null;
  const result = estimateTdee({
    sex,
    age: num(age) || null,
    heightCm: num(height) || null,
    weightKg,
    bodyFatPct,
    activity,
  });

  const openConfirm = (direction: GoalDirection) => {
    if (result == null) return;
    selectionFeedback();
    const calorieGoal = targetFromPace(result, direction, pace);
    const macros = suggestMacros(calorieGoal, weightKg, proteinPref);
    setConfirm({
      direction,
      calorie: String(calorieGoal),
      protein: String(macros.protein),
      carbs: String(macros.carbs),
      fat: String(macros.fat),
    });
  };

  const apply = async () => {
    if (!confirm) return;
    setSaving(true);
    await saveGoals({
      calorieGoal: int(confirm.calorie),
      proteinGoal: int(confirm.protein),
      carbGoal: int(confirm.carbs),
      fatGoal: int(confirm.fat),
      sex,
      age: num(age) || null,
      heightCm: num(height) || null,
      activity,
      goalWeightKg: goalWeight ? displayToKg(num(goalWeight), unit) : null,
    });
    await refresh();
    await updateWidgetSnapshot();
    successFeedback();
    setConfirm(null);
    router.back();
  };

  const impliedKcal = confirm
    ? caloriesFromMacros(int(confirm.protein), int(confirm.carbs), int(confirm.fat))
    : 0;
  const calorieGoalNum = confirm ? int(confirm.calorie) : 0;
  const macroMismatch =
    confirm != null &&
    calorieGoalNum > 0 &&
    Math.abs(impliedKcal - calorieGoalNum) > calorieGoalNum * 0.1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t('calc.lead')}</Text>

        <Card style={styles.card}>
          <Text style={styles.label}>{t('calc.sex')}</Text>
          <SegmentedControl<Sex>
            value={sex}
            onChange={setSex}
            options={[
              { value: 'male', label: t('calc.male') },
              { value: 'female', label: t('calc.female') },
            ]}
          />
          <View style={styles.row}>
            <View style={styles.cell}>
              <Field label={t('calc.age')} value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="yr" />
            </View>
            <View style={styles.cell}>
              <Field label={t('calc.height')} value={height} onChangeText={(v) => setHeight(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="cm" />
            </View>
            <View style={styles.cell}>
              <Field label={t('calc.weightField')} value={weight} onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={unit} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Field label={t('calc.goalWeight')} value={goalWeight} onChangeText={(v) => setGoalWeight(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={unit} />
            </View>
            <View style={styles.cell}>
              <Field label={`${t('calc.bodyFat')} (${t('calc.optional')})`} value={bodyFat} onChangeText={(v) => setBodyFat(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="%" />
            </View>
          </View>
          <Text style={styles.label}>{t('calc.proteinPref')}</Text>
          <SegmentedControl<ProteinPref>
            value={proteinPref}
            onChange={setProteinPref}
            options={[
              { value: 'cut', label: t('calc.prefCut') },
              { value: 'maintain', label: t('calc.prefMaintain') },
              { value: 'build', label: t('calc.prefBuild') },
            ]}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>{t('calc.activity')}</Text>
          {ACTIVITY_LEVELS.map((lvl) => {
            const active = lvl.value === activity;
            const meta = ACTIVITY_I18N[lvl.value];
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
                    {meta ? t(meta.label) : lvl.label}
                  </Text>
                  <Text style={styles.activityHint}>{meta ? t(meta.hint) : lvl.hint}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </Card>

        {result != null ? (
          <Card style={styles.card}>
            <Text style={styles.tdee}>
              {t('calc.maintenance', { n: result.toLocaleString() })}
            </Text>
            <Text style={styles.label}>{t('calc.pace')}</Text>
            <SegmentedControl<string>
              value={String(pace)}
              onChange={(v) => setPace(Number(v))}
              options={[
                { value: String(PACE_OPTIONS[0]), label: t('calc.paceGentle') },
                { value: String(PACE_OPTIONS[1]), label: t('calc.paceStandard') },
                { value: String(PACE_OPTIONS[2]), label: t('calc.paceAggressive') },
              ]}
            />
            <TargetRow label={t('calc.lose')} sub={`−${pace} kcal`} value={targetFromPace(result, 'lose', pace)} onPress={() => openConfirm('lose')} />
            <TargetRow label={t('calc.maintain')} sub={t('calc.maintainSub')} value={targetFromPace(result, 'maintain', pace)} onPress={() => openConfirm('maintain')} />
            <TargetRow label={t('calc.gain')} sub={`+${pace} kcal`} value={targetFromPace(result, 'gain', pace)} onPress={() => openConfirm('gain')} />
          </Card>
        ) : (
          <Text style={styles.fillHint}>{t('calc.fillHint')}</Text>
        )}
      </ScrollView>

      <Modal
        visible={confirm != null}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirm(null)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.overlayDismiss} onPress={() => setConfirm(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t('calc.confirmTitle')}</Text>
              <Text style={styles.sheetSub}>{t('calc.confirmSub')}</Text>
              {confirm ? (
                <>
                  <Field
                    label={t('calc.calorieGoal')}
                    value={confirm.calorie}
                    onChangeText={(v) => setConfirm({ ...confirm, calorie: v.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    suffix="kcal"
                  />
                  <View style={styles.row}>
                    <View style={styles.cell}>
                      <Field label={t('calc.protein')} value={confirm.protein} onChangeText={(v) => setConfirm({ ...confirm, protein: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" suffix="g" />
                    </View>
                    <View style={styles.cell}>
                      <Field label={t('calc.carbs')} value={confirm.carbs} onChangeText={(v) => setConfirm({ ...confirm, carbs: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" suffix="g" />
                    </View>
                    <View style={styles.cell}>
                      <Field label={t('calc.fat')} value={confirm.fat} onChangeText={(v) => setConfirm({ ...confirm, fat: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" suffix="g" />
                    </View>
                  </View>
                  <Text style={[styles.implied, macroMismatch && styles.impliedWarn]}>
                    {t('calc.impliedKcal', { n: impliedKcal.toLocaleString() })}
                  </Text>
                  <PrimaryButton label={t('calc.applyDefault')} onPress={apply} loading={saving} />
                  <GhostButton label={t('calc.cancel')} onPress={() => setConfirm(null)} />
                </>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  container: { flex: 1, backgroundColor: 'transparent' },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  sheetSub: { color: colors.textMuted, fontSize: font.size.sm, marginTop: -spacing.xs },
  implied: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' },
  impliedWarn: { color: colors.warning },
});
