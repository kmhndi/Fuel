import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveGoals } from '@/db/settings';
import { updateWidgetSnapshot } from '@/widgets';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import type { TKey } from '@/i18n/translations';
import { Field, GhostButton, PrimaryButton } from '@/components/ui';
import {
  ACTIVITY_LEVELS,
  displayToKg,
  estimateTdee,
  targetFromPace,
  type GoalDirection,
} from '@/health';
import { caloriesFromMacros, suggestMacros, type ProteinPref } from '@/nutrition';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Sex } from '@/types';

type StepKey =
  | 'lang'
  | 'welcome'
  | 'sex'
  | 'goal'
  | 'activity'
  | 'stats'
  | 'pace'
  | 'result'
  | 'done';

const SEX_ICON: Record<Sex, keyof typeof Ionicons.glyphMap> = {
  male: 'male',
  female: 'female',
};

const GOAL_META: Record<
  GoalDirection,
  { icon: keyof typeof Ionicons.glyphMap; label: TKey; sub: TKey }
> = {
  lose: { icon: 'trending-down', label: 'calc.lose', sub: 'calc.prefCut' },
  maintain: { icon: 'remove-outline', label: 'calc.maintain', sub: 'calc.prefMaintain' },
  gain: { icon: 'trending-up', label: 'calc.gain', sub: 'calc.prefBuild' },
};

const ACTIVITY_META: Record<number, { icon: keyof typeof Ionicons.glyphMap; label: TKey; hint: TKey }> = {
  1.2: { icon: 'bed-outline', label: 'calc.sedentary', hint: 'calc.sedentaryH' },
  1.375: { icon: 'walk-outline', label: 'calc.lightAct', hint: 'calc.lightActH' },
  1.55: { icon: 'bicycle-outline', label: 'calc.moderate', hint: 'calc.moderateH' },
  1.725: { icon: 'barbell-outline', label: 'calc.active', hint: 'calc.activeH' },
  1.9: { icon: 'flame-outline', label: 'calc.veryActive', hint: 'calc.veryActiveH' },
};

const PACE_META: { value: number; icon: keyof typeof Ionicons.glyphMap; label: TKey }[] = [
  { value: 250, icon: 'leaf-outline', label: 'calc.paceGentle' },
  { value: 500, icon: 'speedometer-outline', label: 'calc.paceStandard' },
  { value: 750, icon: 'flash-outline', label: 'calc.paceAggressive' },
];

const proteinPrefFor = (goal: GoalDirection | null): ProteinPref =>
  goal === 'lose' ? 'cut' : goal === 'gain' ? 'build' : 'maintain';

export default function OnboardingScreen() {
  const router = useRouter();
  const { goals, refresh } = useGoals();
  const { t, lang, setLanguage } = useT();
  const unit = goals.weightUnit;

  const [step, setStep] = useState(0);

  // Profile answers
  const [sex, setSex] = useState<Sex>('male');
  const [goal, setGoal] = useState<GoalDirection | null>(null);
  const [activity, setActivity] = useState<number | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [pace, setPace] = useState(500);

  // Editable plan (seeded on the result step)
  const [calorieGoal, setCalorieGoal] = useState('2000');
  const [proteinGoal, setProteinGoal] = useState('140');
  const [carbGoal, setCarbGoal] = useState('220');
  const [fatGoal, setFatGoal] = useState('65');
  const [waterGoal, setWaterGoal] = useState('8');

  const int = (s: string) => {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };
  const num = (s: string) => {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const steps = useMemo<StepKey[]>(() => {
    const base: StepKey[] = ['lang', 'welcome', 'sex', 'goal', 'activity', 'stats'];
    if (goal && goal !== 'maintain') base.push('pace');
    base.push('result', 'done');
    return base;
  }, [goal]);

  const safeStep = Math.min(step, steps.length - 1);
  const key = steps[safeStep];

  const weightKg = weight ? displayToKg(num(weight), unit) : null;
  const tdeeVal = estimateTdee({
    sex,
    age: int(age) || null,
    heightCm: int(height) || null,
    weightKg,
    bodyFatPct: bodyFat ? num(bodyFat) : null,
    activity: activity ?? 1.2,
  });

  // Transition + progress animations.
  const anim = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(progress, {
      toValue: steps.length > 1 ? safeStep / (steps.length - 1) : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [safeStep, steps.length, anim, progress]);

  const seedPlan = () => {
    if (tdeeVal == null) return;
    const target = targetFromPace(tdeeVal, goal ?? 'maintain', pace);
    const macros = suggestMacros(target, weightKg, proteinPrefFor(goal));
    setCalorieGoal(String(target));
    setProteinGoal(String(macros.protein));
    setCarbGoal(String(macros.carbs));
    setFatGoal(String(macros.fat));
  };

  const goNext = () => {
    const nextKey = steps[safeStep + 1];
    if (nextKey === 'result') seedPlan();
    selectionFeedback();
    setStep(safeStep + 1);
  };
  const goBack = () => {
    selectionFeedback();
    setStep(Math.max(0, safeStep - 1));
  };

  const finish = async () => {
    await saveGoals({
      calorieGoal: int(calorieGoal),
      proteinGoal: int(proteinGoal),
      carbGoal: int(carbGoal),
      fatGoal: int(fatGoal),
      waterGoal: Math.max(1, int(waterGoal)),
      sex,
      age: int(age) || null,
      heightCm: int(height) || null,
      activity: activity ?? 1.2,
      goalWeightKg: goalWeight ? displayToKg(num(goalWeight), unit) : null,
    });
    await refresh();
    await updateWidgetSnapshot();
    successFeedback();
    router.replace('/');
  };

  const macroCalories = caloriesFromMacros(int(proteinGoal), int(carbGoal), int(fatGoal));

  const canContinue = (() => {
    switch (key) {
      case 'goal':
        return goal != null;
      case 'activity':
        return activity != null;
      case 'stats':
        return tdeeVal != null;
      default:
        return true;
    }
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.animWrap,
              {
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                ],
              },
            ]}
          >
            {key === 'lang' ? (
              <View style={styles.form}>
                <View style={styles.logo}>
                  <Ionicons name="flash" size={44} color={colors.accent} />
                </View>
                <Text style={styles.title}>{t('onb.chooseLanguage')}</Text>
                <LanguageButton label="English" active={lang === 'en'} onPress={() => setLanguage('en')} />
                <LanguageButton label="العربية" active={lang === 'ar'} onPress={() => setLanguage('ar')} />
                <Text style={styles.hint}>{t('onb.languageHint')}</Text>
              </View>
            ) : null}

            {key === 'welcome' ? (
              <View style={styles.welcome}>
                <View style={styles.logo}>
                  <Ionicons name="flash" size={48} color={colors.accent} />
                </View>
                <Text style={styles.title}>{t('onb.welcomeTitle')}</Text>
                <Text style={styles.body}>{t('onb.welcomeBody')}</Text>
              </View>
            ) : null}

            {key === 'sex' ? (
              <View style={styles.question}>
                <QuestionHeader title={t('onb.qSexTitle')} sub={t('onb.qSexSub')} />
                <View style={styles.grid}>
                  {(['male', 'female'] as Sex[]).map((s) => (
                    <ChoiceCard
                      key={s}
                      icon={SEX_ICON[s]}
                      label={t(s === 'male' ? 'calc.male' : 'calc.female')}
                      active={sex === s}
                      onPress={() => {
                        selectionFeedback();
                        setSex(s);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {key === 'goal' ? (
              <View style={styles.question}>
                <QuestionHeader title={t('onb.qGoalTitle')} sub={t('onb.qGoalSub')} />
                <View style={styles.grid}>
                  {(['lose', 'maintain', 'gain'] as GoalDirection[]).map((g) => (
                    <ChoiceCard
                      key={g}
                      icon={GOAL_META[g].icon}
                      label={t(GOAL_META[g].label)}
                      sub={t(GOAL_META[g].sub)}
                      active={goal === g}
                      onPress={() => {
                        selectionFeedback();
                        setGoal(g);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {key === 'activity' ? (
              <View style={styles.question}>
                <QuestionHeader title={t('onb.qActivityTitle')} sub={t('onb.qActivitySub')} />
                <View style={styles.grid}>
                  {ACTIVITY_LEVELS.map((lvl) => {
                    const meta = ACTIVITY_META[lvl.value];
                    return (
                      <ChoiceCard
                        key={lvl.value}
                        icon={meta.icon}
                        label={t(meta.label)}
                        sub={t(meta.hint)}
                        active={activity === lvl.value}
                        onPress={() => {
                          selectionFeedback();
                          setActivity(lvl.value);
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {key === 'stats' ? (
              <View style={styles.question}>
                <QuestionHeader title={t('onb.qStatsTitle')} sub={t('onb.qStatsSub')} />
                <View style={styles.row}>
                  <View style={styles.cell}>
                    <Field label={t('calc.age')} value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="yr" />
                  </View>
                  <View style={styles.cell}>
                    <Field label={t('calc.height')} value={height} onChangeText={(v) => setHeight(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="cm" />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.cell}>
                    <Field label={t('calc.weightField')} value={weight} onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={unit} />
                  </View>
                  <View style={styles.cell}>
                    <Field label={t('calc.goalWeight')} value={goalWeight} onChangeText={(v) => setGoalWeight(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={unit} />
                  </View>
                </View>
                <Field label={`${t('calc.bodyFat')} (${t('calc.optional')})`} value={bodyFat} onChangeText={(v) => setBodyFat(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="%" />
              </View>
            ) : null}

            {key === 'pace' ? (
              <View style={styles.question}>
                <QuestionHeader title={t('onb.qPaceTitle')} sub={t('onb.qPaceSub')} />
                <View style={styles.grid}>
                  {PACE_META.map((p) => (
                    <ChoiceCard
                      key={p.value}
                      icon={p.icon}
                      label={t(p.label)}
                      sub={`${goal === 'lose' ? '−' : '+'}${p.value} kcal`}
                      active={pace === p.value}
                      onPress={() => {
                        selectionFeedback();
                        setPace(p.value);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {key === 'result' ? (
              <View style={styles.question}>
                <QuestionHeader title={t('onb.qResultTitle')} sub={t('onb.qResultSub')} />
                <Field label={t('calc.calorieGoal')} value={calorieGoal} onChangeText={(v) => setCalorieGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix={t('common.kcal')} />
                <View style={styles.row}>
                  <View style={styles.cell}>
                    <Field label={t('calc.protein')} value={proteinGoal} onChangeText={(v) => setProteinGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                  </View>
                  <View style={styles.cell}>
                    <Field label={t('calc.carbs')} value={carbGoal} onChangeText={(v) => setCarbGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                  </View>
                  <View style={styles.cell}>
                    <Field label={t('calc.fat')} value={fatGoal} onChangeText={(v) => setFatGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                  </View>
                </View>
                {macroCalories > 0 ? (
                  <Text style={styles.hint}>{t('calc.impliedKcal', { n: macroCalories.toLocaleString() })}</Text>
                ) : null}
                <Field label={t('onb.waterGoal')} value={waterGoal} onChangeText={(v) => setWaterGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix={t('onb.glasses')} />
              </View>
            ) : null}

            {key === 'done' ? (
              <View style={styles.welcome}>
                <View style={styles.logo}>
                  <Ionicons name="checkmark" size={48} color={colors.accent} />
                </View>
                <Text style={styles.title}>{t('onb.doneTitle')}</Text>
                <Text style={styles.body}>{t('onb.doneBody')}</Text>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {key === 'done' ? (
            <PrimaryButton label={t('onb.start')} onPress={finish} />
          ) : (
            <PrimaryButton label={t('common.continue')} onPress={goNext} disabled={!canContinue} />
          )}
          {key === 'welcome' ? <GhostButton label={t('common.skip')} onPress={finish} /> : null}
          {safeStep > 0 && key !== 'done' && key !== 'welcome' ? (
            <GhostButton label={t('common.back')} onPress={goBack} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function QuestionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.qHeader}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{sub}</Text>
    </View>
  );
}

function ChoiceCard({
  icon,
  label,
  sub,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        active && styles.choiceActive,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {active ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.accent} style={styles.choiceCheck} />
      ) : null}
      <Ionicons name={icon} size={30} color={active ? colors.accent : colors.text} />
      <Text style={[styles.choiceLabel, active && { color: colors.accent }]}>{label}</Text>
      {sub ? <Text style={styles.choiceSub}>{sub}</Text> : null}
    </Pressable>
  );
}

function LanguageButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.langButton, active && styles.langButtonActive]}>
      <Text style={[styles.langText, active && styles.langTextActive]}>{label}</Text>
      {active ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  animWrap: { gap: spacing.md },
  welcome: { alignItems: 'center', gap: spacing.md },
  question: { gap: spacing.lg },
  qHeader: { gap: spacing.xs },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: font.size.md, lineHeight: 22, textAlign: 'center' },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  hint: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' },
  footer: { padding: spacing.xl, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  choice: {
    width: '46%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  choiceCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  choiceLabel: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold, textAlign: 'center' },
  choiceSub: { color: colors.textMuted, fontSize: font.size.xs, textAlign: 'center' },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  langButtonActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  langText: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  langTextActive: { color: colors.accent },
});
