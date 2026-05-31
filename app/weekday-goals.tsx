import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getGoals, saveGoals } from '@/db/settings';
import { useGoals } from '@/state/GoalsContext';
import { Card, Field, PrimaryButton } from '@/components/ui';
import { successFeedback } from '@/haptics';
import { colors, font, spacing } from '@/theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeekdayGoalsScreen() {
  const router = useRouter();
  const { refresh } = useGoals();
  const [base, setBase] = useState(2000);
  const [values, setValues] = useState<string[]>(['', '', '', '', '', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGoals().then((g) => {
      setBase(g.calorieGoal);
      if (g.weekdayGoals) {
        setValues(g.weekdayGoals.map((v) => (v != null ? String(v) : '')));
      }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const arr = values.map((v) => {
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    });
    // Store null if every day is blank (i.e. no overrides).
    const weekdayGoals = arr.some((v) => v != null) ? arr : null;
    await saveGoals({ weekdayGoals });
    await refresh();
    successFeedback();
    setSaving(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Set different calorie goals for specific days — handy for training vs
          rest days. Leave a day blank to use your default of {base.toLocaleString()} kcal.
        </Text>
        <Card style={styles.card}>
          {DAYS.map((d, i) => (
            <View key={d} style={styles.row}>
              <Text style={styles.day}>{d}</Text>
              <View style={styles.field}>
                <Field
                  label=""
                  value={values[i]}
                  onChangeText={(t) =>
                    setValues((prev) => prev.map((v, j) => (j === i ? t.replace(/[^0-9]/g, '') : v)))
                  }
                  placeholder={`${base}`}
                  keyboardType="number-pad"
                  suffix="kcal"
                />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Save weekday goals" onPress={save} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  lead: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  day: { color: colors.text, fontSize: font.size.md, width: 96 },
  field: { flex: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
