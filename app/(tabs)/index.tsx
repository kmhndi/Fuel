import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  copyMealsFromDay,
  deleteMeal,
  duplicateMeal,
  getDaySummary,
  getLoggedDays,
  getMealsForDay,
  type DaySummary,
} from '@/db/meals';
import { getExerciseTotal } from '@/db/exercise';
import { adjustWater, getWater } from '@/db/water';
import { addCaffeine, clearCaffeine, getCaffeine } from '@/db/caffeine';
import {
  formatDayLabel,
  isFuture,
  isToday,
  shiftDay,
  streakFromDays,
  toDayKey,
} from '@/db/dates';
import { useGoals } from '@/state/GoalsContext';
import { ProgressRing } from '@/components/ProgressRing';
import { MacroBars } from '@/components/MacroBars';
import { WaterCard } from '@/components/WaterCard';
import { CaffeineCard } from '@/components/CaffeineCard';
import { Celebration } from '@/components/Celebration';
import { Card, EmptyState } from '@/components/ui';
import { mealTypeMeta } from '@/nutrition';
import { successFeedback, tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import { MEAL_TYPES, type Meal, type MealType } from '@/types';

interface Section {
  type: MealType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  calories: number;
  data: Meal[];
}

const EMPTY_SUMMARY: DaySummary = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  count: 0,
};

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goals, loaded } = useGoals();
  const onboardedPrompted = useRef(false);
  const [day, setDay] = useState(() => toDayKey());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<DaySummary>(EMPTY_SUMMARY);
  const [water, setWater] = useState(0);
  const [caffeine, setCaffeine] = useState(0);
  const [exercise, setExercise] = useState(0);
  const [streak, setStreak] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(async () => {
    const [dayMeals, daySummary, glasses, mg, burned, loggedDays] =
      await Promise.all([
        getMealsForDay(day),
        getDaySummary(day),
        getWater(day),
        getCaffeine(day),
        getExerciseTotal(day),
        getLoggedDays(60),
      ]);
    setMeals(dayMeals);
    setSummary(daySummary);
    setWater(glasses);
    setCaffeine(mg);
    setExercise(burned);
    setStreak(streakFromDays(loggedDays));
  }, [day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // On a confirmed first run, present onboarding once.
  useEffect(() => {
    if (loaded && !goals.onboarded && !onboardedPrompted.current) {
      onboardedPrompted.current = true;
      router.push('/onboarding');
    }
  }, [loaded, goals.onboarded, router]);

  const onAddWater = useCallback(async () => {
    const next = await adjustWater(day, 1);
    setWater(next);
    // Celebrate the moment the daily goal is reached.
    if (next === goals.waterGoal) {
      successFeedback();
      setCelebrate(true);
    }
  }, [day, goals.waterGoal]);

  const onRemoveWater = useCallback(async () => {
    setWater(await adjustWater(day, -1));
  }, [day]);

  const onCopyYesterday = useCallback(() => {
    const from = shiftDay(day, -1);
    Alert.alert(
      'Copy yesterday',
      `Copy all meals from ${formatDayLabel(from)} into ${formatDayLabel(day)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: async () => {
            const n = await copyMealsFromDay(from, day);
            if (n > 0) successFeedback();
            load();
            if (n === 0) {
              Alert.alert('Nothing to copy', `No meals were logged ${formatDayLabel(from).toLowerCase()}.`);
            }
          },
        },
      ],
    );
  }, [day, load]);

  const onMealActions = useCallback(
    (meal: Meal) => {
      Alert.alert(meal.name, undefined, [
        { text: 'Edit', onPress: () => router.push(`/add-meal?id=${meal.id}`) },
        {
          text: 'Duplicate',
          onPress: async () => {
            await duplicateMeal(meal);
            tapFeedback();
            load();
          },
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteMeal(meal.id);
            load();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [router, load],
  );

  const sections: Section[] = MEAL_TYPES.map((type) => {
    const data = meals.filter((m) => m.mealType === type);
    return {
      type,
      title: mealTypeMeta[type].label,
      icon: mealTypeMeta[type].icon,
      calories: data.reduce((sum, m) => sum + m.calories, 0),
      data,
    };
  }).filter((s) => s.data.length > 0);

  return (
    <View style={styles.container}>
      <DateBar
        day={day}
        onPrev={() => setDay((d) => shiftDay(d, -1))}
        onNext={() => setDay((d) => shiftDay(d, 1))}
        onToday={() => setDay(toDayKey())}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            {!goals.onboarded ? (
              <Pressable
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [styles.banner, pressed && styles.rowPressed]}
              >
                <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
                <Text style={styles.bannerText}>Set your daily goals</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </Pressable>
            ) : null}

            <DayOverview
              summary={summary}
              exercise={exercise}
              goals={goals}
              onAddExercise={() => router.push(`/add-exercise?day=${day}`)}
            />

            {streak > 1 ? (
              <View style={styles.insight}>
                <Ionicons name="flame" size={16} color={colors.warning} />
                <Text style={styles.insightText}>
                  {streak}-day logging streak — keep it going!
                </Text>
              </View>
            ) : null}

            <QuickActions
              onQuick={() => router.push(`/add-meal?day=${day}&quick=1`)}
              onExercise={() => router.push(`/add-exercise?day=${day}`)}
              onCopy={onCopyYesterday}
            />

            <WaterCard
              glasses={water}
              goal={goals.waterGoal}
              glassMl={goals.glassMl}
              onAdd={onAddWater}
              onRemove={onRemoveWater}
            />

            <View style={styles.cardGap}>
              <CaffeineCard
                mg={caffeine}
                limit={goals.caffeineLimit}
                onAdd={async (mg) => setCaffeine(await addCaffeine(day, mg))}
                onReset={async () => {
                  await clearCaffeine(day);
                  setCaffeine(0);
                }}
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Ionicons name={section.icon} size={16} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCalories}>
              {section.calories.toLocaleString()} kcal
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <MealRow
            meal={item}
            onPress={() => router.push(`/add-meal?id=${item.id}`)}
            onLongPress={() => onMealActions(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="restaurant-outline" size={40} color={colors.textMuted} />}
            title={isToday(day) ? 'Nothing logged yet' : 'No meals this day'}
            subtitle="Tap + to add a meal, or use Copy yesterday. Logged foods become one-tap quick-adds."
          />
        }
      />

      <Pressable
        onPress={() => {
          tapFeedback();
          router.push(`/add-meal?day=${day}`);
        }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          pressed && styles.fabPressed,
        ]}
        accessibilityLabel="Log a meal"
      >
        <Ionicons name="add" size={32} color={colors.bg} />
      </Pressable>

      <Celebration show={celebrate} onDone={() => setCelebrate(false)} />
    </View>
  );
}

function DateBar({
  day,
  onPrev,
  onNext,
  onToday,
}: {
  day: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const atToday = isToday(day);
  const nextDisabled = isFuture(shiftDay(day, 1));
  return (
    <View style={styles.dateBar}>
      <Pressable onPress={onPrev} hitSlop={8} style={styles.arrow}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={onToday} disabled={atToday} style={styles.dateLabelWrap}>
        <Text style={styles.dateLabel}>{formatDayLabel(day)}</Text>
        {!atToday ? <Text style={styles.jumpToday}>Jump to today</Text> : null}
      </Pressable>
      <Pressable
        onPress={onNext}
        disabled={nextDisabled}
        hitSlop={8}
        style={[styles.arrow, nextDisabled && styles.arrowDisabled]}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function DayOverview({
  summary,
  exercise,
  goals,
  onAddExercise,
}: {
  summary: DaySummary;
  exercise: number;
  goals: ReturnType<typeof useGoals>['goals'];
  onAddExercise: () => void;
}) {
  const budget = goals.calorieGoal + exercise;
  const remaining = budget - summary.calories;
  const progress = budget > 0 ? summary.calories / budget : 0;
  const over = remaining < 0;

  return (
    <Card style={styles.overviewCard}>
      <ProgressRing progress={progress} size={196} strokeWidth={16}>
        <Text style={styles.ringValue}>{Math.abs(remaining).toLocaleString()}</Text>
        <Text style={styles.ringLabel}>{over ? 'kcal over' : 'kcal left'}</Text>
        <Text style={styles.ringSub}>
          {summary.calories.toLocaleString()} / {budget.toLocaleString()}
        </Text>
      </ProgressRing>

      <Pressable onPress={onAddExercise} style={styles.budgetLine} hitSlop={6}>
        <Text style={styles.budgetText}>
          Goal {goals.calorieGoal.toLocaleString()}
        </Text>
        <View style={styles.exerciseChip}>
          <Ionicons name="barbell-outline" size={13} color={colors.accent} />
          <Text style={styles.exerciseText}>
            {exercise > 0 ? `+${exercise.toLocaleString()} exercise` : 'Add exercise'}
          </Text>
        </View>
      </Pressable>

      <View style={styles.macrosWrap}>
        <MacroBars
          protein={summary.protein}
          carbs={summary.carbs}
          fat={summary.fat}
          proteinGoal={goals.proteinGoal}
          carbGoal={goals.carbGoal}
          fatGoal={goals.fatGoal}
        />
      </View>
    </Card>
  );
}

function QuickActions({
  onQuick,
  onExercise,
  onCopy,
}: {
  onQuick: () => void;
  onExercise: () => void;
  onCopy: () => void;
}) {
  return (
    <View style={styles.quickActions}>
      <QuickAction icon="flash-outline" label="Quick kcal" onPress={onQuick} />
      <QuickAction icon="barbell-outline" label="Exercise" onPress={onExercise} />
      <QuickAction icon="copy-outline" label="Copy day" onPress={onCopy} />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.quickAction, pressed && styles.rowPressed]}
    >
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function MealRow({
  meal,
  onPress,
  onLongPress,
}: {
  meal: Meal;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const macros = [
    meal.protein > 0 ? `P ${Math.round(meal.protein)}` : null,
    meal.carbs > 0 ? `C ${Math.round(meal.carbs)}` : null,
    meal.fat > 0 ? `F ${Math.round(meal.fat)}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.mealRow, pressed && styles.rowPressed]}
    >
      <View style={styles.mealInfo}>
        <View style={styles.mealNameRow}>
          <Text style={styles.mealName} numberOfLines={1}>
            {meal.name}
          </Text>
          {meal.tag ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{meal.tag}</Text>
            </View>
          ) : null}
        </View>
        {meal.note ? (
          <Text style={styles.mealNote} numberOfLines={1}>
            {meal.note}
          </Text>
        ) : macros ? (
          <Text style={styles.mealMacros}>{macros}</Text>
        ) : null}
      </View>
      <Text style={styles.mealCalories}>{meal.calories.toLocaleString()} kcal</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  arrow: { padding: spacing.xs },
  arrowDisabled: { opacity: 0.25 },
  dateLabelWrap: { alignItems: 'center' },
  dateLabel: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  jumpToday: { color: colors.accent, fontSize: font.size.xs, marginTop: 2 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  bannerText: { flex: 1, color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
  overviewCard: { alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  ringValue: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.bold },
  ringLabel: { color: colors.textMuted, fontSize: font.size.sm, marginTop: -spacing.xs },
  ringSub: { color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.sm },
  budgetLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
  budgetText: { color: colors.textMuted, fontSize: font.size.sm },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentDim,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  exerciseText: { color: colors.accent, fontSize: font.size.xs, fontWeight: font.weight.medium },
  macrosWrap: { alignSelf: 'stretch' },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  insightText: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
  cardGap: { marginTop: spacing.md },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  quickActionLabel: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  sectionCalories: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.medium },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  mealInfo: { flex: 1, marginRight: spacing.md, gap: 2 },
  mealNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium, flexShrink: 1 },
  tagPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  tagPillText: { color: colors.textMuted, fontSize: 10, fontWeight: font.weight.medium },
  mealMacros: { color: colors.textMuted, fontSize: font.size.xs },
  mealNote: { color: colors.textMuted, fontSize: font.size.xs, fontStyle: 'italic' },
  mealCalories: { color: colors.accent, fontSize: font.size.md, fontWeight: font.weight.semibold },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },
});
