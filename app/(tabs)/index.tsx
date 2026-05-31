import { useCallback, useState } from 'react';
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
  deleteMeal,
  getDaySummary,
  getMealsForDay,
  type DaySummary,
} from '@/db/meals';
import {
  formatDayLabel,
  isFuture,
  isToday,
  shiftDay,
  toDayKey,
} from '@/db/dates';
import { useGoals } from '@/state/GoalsContext';
import { ProgressRing } from '@/components/ProgressRing';
import { MacroBars } from '@/components/MacroBars';
import { Card, EmptyState } from '@/components/ui';
import { mealTypeMeta } from '@/nutrition';
import { tapFeedback } from '@/haptics';
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
  const { goals } = useGoals();
  const [day, setDay] = useState(() => toDayKey());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<DaySummary>(EMPTY_SUMMARY);

  const load = useCallback(async () => {
    const [dayMeals, daySummary] = await Promise.all([
      getMealsForDay(day),
      getDaySummary(day),
    ]);
    setMeals(dayMeals);
    setSummary(daySummary);
  }, [day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmDelete = useCallback(
    (meal: Meal) => {
      Alert.alert('Remove meal', `Remove "${meal.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteMeal(meal.id);
            load();
          },
        },
      ]);
    },
    [load],
  );

  // Group meals into ordered, non-empty sections by meal type.
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
                <Text style={styles.bannerText}>
                  Set your daily calorie & macro goals
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </Pressable>
            ) : null}
            <DayOverview summary={summary} goals={goals} />
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
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Ionicons name="restaurant-outline" size={40} color={colors.textMuted} />
            }
            title={isToday(day) ? 'Nothing logged yet' : 'No meals this day'}
            subtitle="Tap the + button to add a meal. Foods you log become one-tap quick-adds."
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
  goals,
}: {
  summary: DaySummary;
  goals: ReturnType<typeof useGoals>['goals'];
}) {
  const remaining = goals.calorieGoal - summary.calories;
  const progress = goals.calorieGoal > 0 ? summary.calories / goals.calorieGoal : 0;
  const over = remaining < 0;

  return (
    <Card style={styles.overviewCard}>
      <ProgressRing progress={progress} size={196} strokeWidth={16}>
        <Text style={styles.ringValue}>{Math.abs(remaining).toLocaleString()}</Text>
        <Text style={styles.ringLabel}>{over ? 'kcal over' : 'kcal left'}</Text>
        <Text style={styles.ringSub}>
          {summary.calories.toLocaleString()} / {goals.calorieGoal.toLocaleString()}
        </Text>
      </ProgressRing>

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
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.name}
        </Text>
        {macros ? <Text style={styles.mealMacros}>{macros}</Text> : null}
      </View>
      <Text style={styles.mealCalories}>{meal.calories.toLocaleString()} kcal</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  arrow: {
    padding: spacing.xs,
  },
  arrowDisabled: {
    opacity: 0.25,
  },
  dateLabelWrap: {
    alignItems: 'center',
  },
  dateLabel: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
  },
  jumpToday: {
    color: colors.accent,
    fontSize: font.size.xs,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
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
  bannerText: {
    flex: 1,
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  overviewCard: {
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  ringValue: {
    color: colors.text,
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
  },
  ringLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    marginTop: -spacing.xs,
  },
  ringSub: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    marginTop: spacing.sm,
  },
  macrosWrap: {
    alignSelf: 'stretch',
  },
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
  sectionCalories: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
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
  rowPressed: {
    opacity: 0.7,
  },
  mealInfo: {
    flex: 1,
    marginRight: spacing.md,
    gap: 2,
  },
  mealName: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
  },
  mealMacros: {
    color: colors.textMuted,
    fontSize: font.size.xs,
  },
  mealCalories: {
    color: colors.accent,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
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
  fabPressed: {
    opacity: 0.85,
  },
});
