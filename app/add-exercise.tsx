import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addExercise } from '@/db/exercise';
import { Field, PrimaryButton } from '@/components/ui';
import { useT } from '@/i18n';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

/** Rough calorie burns for common activities, as quick presets. */
const PRESETS = [
  { label: 'Walk 30m', calories: 120 },
  { label: 'Run 30m', calories: 320 },
  { label: 'Gym', calories: 300 },
  { label: 'Cycling', calories: 250 },
];

export default function AddExerciseScreen() {
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{ day?: string }>();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = Number.parseInt(calories, 10);
  const canSave = Number.isFinite(parsed) && parsed > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await addExercise(name.trim() || 'Exercise', parsed, params.day);
      successFeedback();
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
        <Text style={styles.lead}>{t('ex.lead')}</Text>

        <Field
          label={t('ex.activity')}
          value={name}
          onChangeText={setName}
          placeholder={t('ex.activityPlaceholder')}
          autoFocus
        />
        <Field
          label={t('ex.caloriesBurned')}
          value={calories}
          onChangeText={(v) => setCalories(v.replace(/[^0-9]/g, ''))}
          placeholder="0"
          keyboardType="number-pad"
          suffix={t('common.kcal')}
        />

        <Text style={styles.quickLabel}>{t('ex.quickAdd')}</Text>
        <View style={styles.chips}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.label}
              onPress={() => {
                selectionFeedback();
                if (!name.trim()) setName(p.label.replace(/ \d+m$/, ''));
                setCalories(String(p.calories));
              }}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Text style={styles.chipLabel}>{p.label}</Text>
              <Text style={styles.chipCals}>{p.calories} {t('common.kcal')}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={t('ex.log')}
          onPress={save}
          disabled={!canSave}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.lg },
  lead: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  quickLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginBottom: -spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  chipLabel: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
  chipCals: { color: colors.textMuted, fontSize: font.size.xs },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
