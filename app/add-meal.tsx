import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addMeal } from '@/db/meals';
import { PrimaryButton } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';

/** Common rough calorie estimates to make logging a tap instead of a guess. */
const QUICK_ADD = [
  { label: 'Coffee', calories: 5 },
  { label: 'Snack', calories: 150 },
  { label: 'Light meal', calories: 400 },
  { label: 'Full meal', calories: 700 },
];

export default function AddMealScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedCalories = Number.parseInt(calories, 10);
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(parsedCalories) &&
    parsedCalories > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await addMeal({ name: name.trim(), calories: parsedCalories });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What did you eat?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Greek yogurt with berries"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
          returnKeyType="next"
        />

        <Text style={styles.label}>Calories</Text>
        <TextInput
          value={calories}
          onChangeText={(t) => setCalories(t.replace(/[^0-9]/g, ''))}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <Text style={styles.quickLabel}>Quick add</Text>
        <View style={styles.quickRow}>
          {QUICK_ADD.map((q) => (
            <Pressable
              key={q.label}
              onPress={() => {
                if (!name.trim()) setName(q.label);
                setCalories(String(q.calories));
              }}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={styles.chipLabel}>{q.label}</Text>
              <Text style={styles.chipCalories}>{q.calories} kcal</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Log meal"
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
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: font.size.lg,
  },
  quickLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginTop: spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipLabel: {
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  chipCalories: {
    color: colors.textMuted,
    fontSize: font.size.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
