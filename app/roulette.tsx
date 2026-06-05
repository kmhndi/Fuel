import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addMeal, getDaySummary } from '@/db/meals';
import { getFoodSuggestions } from '@/db/foods';
import { toDayKey } from '@/db/dates';
import { getRemainingMacros, type RemainingMacros } from '@/health';
import { mealTypeForNow, macroColors } from '@/nutrition';
import { pickRoulette } from '@/suggest';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { EmptyState, GhostButton, PrimaryButton } from '@/components/ui';
import { successFeedback, tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Food } from '@/types';

export default function RouletteScreen() {
  const router = useRouter();
  const { t } = useT();
  const { goals } = useGoals();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day ?? toDayKey();

  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<Food[]>([]);
  const [remaining, setRemaining] = useState<RemainingMacros | null>(null);
  const [pick, setPick] = useState<Food | null>(null);
  const [logging, setLogging] = useState(false);

  const spin = useRef(new Animated.Value(1)).current;

  const choose = useCallback(
    (pool: Food[], rem: RemainingMacros, exclude?: Food | null) => {
      let next = pickRoulette(pool, rem);
      // On a re-spin, try a few times to land on a different food.
      if (next && exclude && next.id === exclude.id && pool.length > 1) {
        for (let i = 0; i < 5 && next.id === exclude.id; i++) {
          next = pickRoulette(pool, rem) ?? next;
        }
      }
      setPick(next);
      if (next) {
        spin.setValue(0);
        Animated.timing(spin, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    },
    [spin],
  );

  useEffect(() => {
    (async () => {
      const [summary, library] = await Promise.all([
        getDaySummary(day),
        getFoodSuggestions('', 100),
      ]);
      const rem = getRemainingMacros(day, goals, summary);
      setFoods(library);
      setRemaining(rem);
      choose(library, rem);
      setLoading(false);
    })();
  }, [day, goals, choose]);

  const onSpin = () => {
    tapFeedback();
    if (remaining) choose(foods, remaining, pick);
  };

  const onLog = async () => {
    if (!pick || logging) return;
    setLogging(true);
    await addMeal(
      {
        name: pick.name,
        calories: pick.calories,
        protein: pick.protein,
        carbs: pick.carbs,
        fat: pick.fat,
        mealType: mealTypeForNow(),
      },
      day,
    );
    successFeedback();
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Nothing saved yet → point the user at logging their first meals.
  if (foods.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <EmptyState
            icon={<Ionicons name="dice-outline" size={40} color={colors.textMuted} />}
            title={t('roulette.emptyTitle')}
            subtitle={t('roulette.emptySub')}
          />
        </View>
        <View style={styles.footer}>
          <PrimaryButton
            label={t('roulette.logMeal')}
            onPress={() => router.replace(`/add-meal?day=${day}`)}
          />
        </View>
      </View>
    );
  }

  // Library has foods but the day is full (or nothing fits the room left).
  if (!pick) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <EmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={40} color={colors.accent} />}
            title={t('roulette.fullTitle')}
            subtitle={t('roulette.fullSub')}
          />
        </View>
        <View style={styles.footer}>
          <GhostButton label={t('roulette.close')} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const calLeft = Math.max(0, Math.round(remaining?.calLeft ?? 0));
  const showProtein = (remaining?.proteinLeft ?? 0) > 5 && pick.protein > 0;
  const cardScale = spin.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const diceSpin = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Text style={styles.lead}>{t('roulette.lead')}</Text>

      <View style={styles.center}>
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          <Animated.View style={{ transform: [{ rotate: diceSpin }] }}>
            <Ionicons name="dice" size={40} color={colors.accent} />
          </Animated.View>
          <Text style={styles.foodName} numberOfLines={2}>
            {pick.name}
          </Text>
          <Text style={styles.cal}>
            {pick.calories.toLocaleString()} {t('common.kcal')}
          </Text>
          <View style={styles.macros}>
            <MacroChip label={t('meal.protein')} value={pick.protein} color={macroColors.protein} />
            <MacroChip label={t('meal.carbs')} value={pick.carbs} color={macroColors.carbs} />
            <MacroChip label={t('meal.fat')} value={pick.fat} color={macroColors.fat} />
          </View>
          <Text style={styles.fit}>
            {t('roulette.fits', { n: calLeft.toLocaleString() })}
            {showProtein ? ` · ${t('roulette.plusProtein', { n: Math.round(pick.protein) })}` : ''}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label={t('roulette.logIt')} onPress={onLog} loading={logging} />
        <GhostButton label={t('roulette.again')} onPress={onSpin} />
      </View>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={styles.chipValue}>{Math.round(value)}g</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  lead: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    lineHeight: 20,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  foodName: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  cal: { color: colors.accent, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  macros: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  chip: { alignItems: 'center', gap: 2 },
  chipDot: { width: 18, height: 4, borderRadius: 2, marginBottom: spacing.xs },
  chipValue: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold },
  chipLabel: { color: colors.textMuted, fontSize: font.size.xs },
  fit: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
