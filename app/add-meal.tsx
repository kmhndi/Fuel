import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addMeal, getMeal, updateMeal } from '@/db/meals';
import {
  getFoodSuggestions,
  toggleFavorite as toggleFoodFavorite,
} from '@/db/foods';
import { Field, PrimaryButton, SegmentedControl } from '@/components/ui';
import { caloriesFromMacros, mealTypeForNow, mealTypeMeta } from '@/nutrition';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import { MEAL_TYPES, type Food, type MealType } from '@/types';

export default function AddMealScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string; day?: string; quick?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null;
  const isQuick = params.quick === '1' && !isEditing;

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [note, setNote] = useState('');
  const [mealType, setMealType] = useState<MealType>(mealTypeForNow());
  const [caloriesEdited, setCaloriesEdited] = useState(false);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the meal being edited, or fall back to the add title.
  useEffect(() => {
    navigation.setOptions({
      title: isQuick ? 'Quick calories' : isEditing ? 'Edit meal' : 'Log a meal',
    });
    if (editingId !== null) {
      getMeal(editingId).then((meal) => {
        if (!meal) return;
        setName(meal.name);
        setCalories(String(meal.calories));
        setProtein(meal.protein ? String(meal.protein) : '');
        setCarbs(meal.carbs ? String(meal.carbs) : '');
        setFat(meal.fat ? String(meal.fat) : '');
        setNote(meal.note ?? '');
        setMealType(meal.mealType);
        setCaloriesEdited(true);
      });
    }
  }, [editingId, isEditing, isQuick, navigation]);

  // Live food-library search keyed off the name field (recents when empty).
  const refreshSuggestions = useCallback(async () => {
    if (isEditing || isQuick) return;
    setSuggestions(await getFoodSuggestions(name, 12));
  }, [name, isEditing, isQuick]);

  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  const num = (s: string) => {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const macroCalories = caloriesFromMacros(num(protein), num(carbs), num(fat));

  // Auto-fill calories from macros until the user types calories themselves.
  useEffect(() => {
    if (!caloriesEdited) {
      setCalories(macroCalories > 0 ? String(macroCalories) : '');
    }
  }, [macroCalories, caloriesEdited]);

  const applyFood = (food: Food) => {
    selectionFeedback();
    setName(food.name);
    setProtein(food.protein ? String(food.protein) : '');
    setCarbs(food.carbs ? String(food.carbs) : '');
    setFat(food.fat ? String(food.fat) : '');
    setCalories(String(food.calories));
    setCaloriesEdited(true);
  };

  const parsedCalories = Number.parseInt(calories, 10);
  const caloriesOk = Number.isFinite(parsedCalories) && parsedCalories >= 0;
  const canSave = isQuick
    ? caloriesOk && parsedCalories > 0
    : caloriesOk && name.trim().length > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim() || (isQuick ? 'Quick add' : ''),
        calories: parsedCalories,
        protein: num(protein),
        carbs: num(carbs),
        fat: num(fat),
        mealType,
        note: note.trim() || null,
      };
      if (editingId !== null) {
        await updateMeal(editingId, payload);
      } else {
        await addMeal(payload, params.day);
      }
      successFeedback();
      router.back();
    } catch {
      setSaving(false);
    }
  };

  const onFavorite = async (food: Food) => {
    await toggleFoodFavorite(food);
    refreshSuggestions();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl<MealType>
          value={mealType}
          onChange={setMealType}
          options={MEAL_TYPES.map((t) => ({
            value: t,
            label: mealTypeMeta[t].label,
          }))}
        />

        <Field
          label={isQuick ? 'Name (optional)' : 'Food'}
          value={name}
          onChangeText={setName}
          placeholder={isQuick ? 'Quick add' : 'e.g. Greek yogurt with berries'}
          autoFocus={!isEditing && !isQuick}
        />

        {!isEditing && !isQuick && suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>
              {name.trim() ? 'Matches' : 'Recent & favorites'}
            </Text>
            {suggestions.map((food) => (
              <Pressable
                key={food.id}
                onPress={() => applyFood(food)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text style={styles.suggestionMeta}>
                    {food.calories} kcal
                    {food.protein ? ` · P ${Math.round(food.protein)}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onFavorite(food)}
                  hitSlop={10}
                  style={styles.star}
                >
                  <Ionicons
                    name={food.isFavorite ? 'star' : 'star-outline'}
                    size={20}
                    color={food.isFavorite ? colors.warning : colors.textMuted}
                  />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Field
          label="Calories"
          value={calories}
          onChangeText={(t) => {
            setCaloriesEdited(true);
            setCalories(t.replace(/[^0-9]/g, ''));
          }}
          placeholder="0"
          keyboardType="number-pad"
          suffix="kcal"
          autoFocus={isQuick}
        />

        {!isQuick ? (
          <>
            <Text style={styles.macrosHeading}>Macros (optional)</Text>
            <View style={styles.macrosRow}>
          <View style={styles.macroCell}>
            <Field
              label="Protein"
              value={protein}
              onChangeText={(t) => setProtein(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              style={styles.macroInput}
            />
          </View>
          <View style={styles.macroCell}>
            <Field
              label="Carbs"
              value={carbs}
              onChangeText={(t) => setCarbs(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              style={styles.macroInput}
            />
          </View>
          <View style={styles.macroCell}>
            <Field
              label="Fat"
              value={fat}
              onChangeText={(t) => setFat(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              style={styles.macroInput}
            />
          </View>
        </View>
            {macroCalories > 0 ? (
              <Text style={styles.macroHint}>
                Macros add up to ~{macroCalories} kcal
              </Text>
            ) : null}
          </>
        ) : null}

        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Anything worth remembering"
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={isEditing ? 'Save changes' : 'Log meal'}
          onPress={save}
          disabled={!canSave}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  suggestions: {
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  suggestionsLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  suggestionInfo: {
    flex: 1,
    gap: 2,
  },
  suggestionName: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
  },
  suggestionMeta: {
    color: colors.textMuted,
    fontSize: font.size.xs,
  },
  star: {
    padding: spacing.xs,
  },
  macrosHeading: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    marginBottom: -spacing.sm,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCell: {
    flex: 1,
  },
  macroInput: {
    fontSize: font.size.md,
  },
  macroHint: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    marginTop: -spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
