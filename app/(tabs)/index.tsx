import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deleteMeal, getDayTotal, getMealsForDay } from '@/db/meals';
import { toDayKey } from '@/db/dates';
import { Card, EmptyState } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import type { Meal } from '@/types';

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const day = toDayKey();
    const [dayMeals, dayTotal] = await Promise.all([
      getMealsForDay(day),
      getDayTotal(day),
    ]);
    setMeals(dayMeals);
    setTotal(dayTotal);
  }, []);

  // Reload whenever the tab regains focus (e.g. after logging a meal).
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

  return (
    <View style={styles.container}>
      <FlatList
        data={meals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<TotalCard total={total} count={meals.length} />}
        renderItem={({ item }) => (
          <MealRow meal={item} onLongPress={() => confirmDelete(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="restaurant-outline" size={40} color={colors.textMuted} />}
            title="Nothing logged yet"
            subtitle="Tap the + button to quick-add your first meal of the day."
          />
        }
      />

      <Pressable
        onPress={() => router.push('/add-meal')}
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

function TotalCard({ total, count }: { total: number; count: number }) {
  return (
    <Card style={styles.totalCard}>
      <Text style={styles.totalLabel}>Today's total</Text>
      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>{total.toLocaleString()}</Text>
        <Text style={styles.totalUnit}>kcal</Text>
      </View>
      <Text style={styles.totalMeta}>
        {count === 0
          ? 'No meals logged'
          : `${count} ${count === 1 ? 'meal' : 'meals'} logged`}
      </Text>
    </Card>
  );
}

function MealRow({
  meal,
  onLongPress,
}: {
  meal: Meal;
  onLongPress: () => void;
}) {
  const time = new Date(meal.loggedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.mealRow, pressed && styles.mealRowPressed]}
    >
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.mealTime}>{time}</Text>
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
  listContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  totalCard: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  totalValue: {
    color: colors.text,
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
  },
  totalUnit: {
    color: colors.textMuted,
    fontSize: font.size.lg,
    marginBottom: spacing.sm,
  },
  totalMeta: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    marginTop: spacing.xs,
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
  },
  mealRowPressed: {
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
  mealTime: {
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
