import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteFood,
  getFoodSuggestions,
  toggleFavorite,
} from '@/db/foods';
import { addMeal } from '@/db/meals';
import { Field, EmptyState } from '@/components/ui';
import { mealTypeForNow } from '@/nutrition';
import { successFeedback, tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Food } from '@/types';

export default function FoodLibraryScreen() {
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);

  const load = useCallback(async () => {
    setFoods(await getFoodSuggestions(query, 100));
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onLogNow = async (food: Food) => {
    await addMeal({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      mealType: mealTypeForNow(),
    });
    successFeedback();
    Alert.alert('Logged', `Added ${food.name} to today.`);
  };

  const onToggleFav = async (food: Food) => {
    tapFeedback();
    await toggleFavorite(food);
    load();
  };

  const onDelete = (food: Food) => {
    Alert.alert('Remove from library', `Remove "${food.name}"? Past meals stay logged.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteFood(food.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Field
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={foods}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const macros = [
            item.protein ? `P ${Math.round(item.protein)}` : null,
            item.carbs ? `C ${Math.round(item.carbs)}` : null,
            item.fat ? `F ${Math.round(item.fat)}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              onLongPress={() => onDelete(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Pressable onPress={() => onToggleFav(item)} hitSlop={8} style={styles.star}>
                <Ionicons
                  name={item.isFavorite ? 'star' : 'star-outline'}
                  size={20}
                  color={item.isFavorite ? colors.warning : colors.textMuted}
                />
              </Pressable>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.calories} kcal{macros ? ` · ${macros}` : ''} · used {item.useCount}×
                </Text>
              </View>
              <Pressable onPress={() => onLogNow(item)} hitSlop={8} style={styles.add}>
                <Ionicons name="add-circle" size={28} color={colors.accent} />
              </Pressable>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="fast-food-outline" size={40} color={colors.textMuted} />}
            title={query ? 'No matches' : 'No saved foods yet'}
            subtitle="Foods you log are saved here automatically for one-tap re-adding."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  star: { padding: 2 },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  meta: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  add: { padding: 2 },
});
