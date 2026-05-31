import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveGoals } from '@/db/settings';
import { useGoals } from '@/state/GoalsContext';
import { Field, GhostButton, PrimaryButton } from '@/components/ui';
import { caloriesFromMacros } from '@/nutrition';
import { successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { refresh } = useGoals();
  const [step, setStep] = useState(0);

  const [calorieGoal, setCalorieGoal] = useState('2000');
  const [proteinGoal, setProteinGoal] = useState('140');
  const [carbGoal, setCarbGoal] = useState('220');
  const [fatGoal, setFatGoal] = useState('65');
  const [waterGoal, setWaterGoal] = useState('8');

  const int = (s: string) => {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const finish = async () => {
    await saveGoals({
      calorieGoal: int(calorieGoal),
      proteinGoal: int(proteinGoal),
      carbGoal: int(carbGoal),
      fatGoal: int(fatGoal),
      waterGoal: Math.max(1, int(waterGoal)),
    });
    await refresh();
    successFeedback();
    router.replace('/');
  };

  const macroCalories = caloriesFromMacros(int(proteinGoal), int(carbGoal), int(fatGoal));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.logo}>
                <Ionicons name="flash" size={48} color={colors.accent} />
              </View>
              <Text style={styles.title}>Welcome to Fuel</Text>
              <Text style={styles.body}>
                A private, on-device tracker for your calories, macros, water and
                supplements. No account, no cloud — just you and your data.
              </Text>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.title}>Your daily goals</Text>
              <Text style={styles.body}>You can fine-tune these any time in Settings.</Text>
              <Field
                label="Calories"
                value={calorieGoal}
                onChangeText={(t) => setCalorieGoal(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix="kcal"
              />
              <View style={styles.row}>
                <View style={styles.cell}>
                  <Field label="Protein" value={proteinGoal} onChangeText={(t) => setProteinGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                </View>
                <View style={styles.cell}>
                  <Field label="Carbs" value={carbGoal} onChangeText={(t) => setCarbGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                </View>
                <View style={styles.cell}>
                  <Field label="Fat" value={fatGoal} onChangeText={(t) => setFatGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                </View>
              </View>
              {macroCalories > 0 ? (
                <Text style={styles.hint}>Macros total ~{macroCalories.toLocaleString()} kcal</Text>
              ) : null}
              <Field
                label="Water goal"
                value={waterGoal}
                onChangeText={(t) => setWaterGoal(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix="glasses"
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.welcome}>
              <View style={styles.logo}>
                <Ionicons name="checkmark" size={48} color={colors.accent} />
              </View>
              <Text style={styles.title}>You're all set</Text>
              <Text style={styles.body}>
                Tap the + on the Today tab to log your first meal. Foods you log
                become one-tap quick-adds. Enjoy!
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step < 2 ? (
            <PrimaryButton label="Continue" onPress={() => setStep((s) => s + 1)} />
          ) : (
            <PrimaryButton label="Start tracking" onPress={finish} />
          )}
          {step === 0 ? <GhostButton label="Skip" onPress={finish} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.accent, width: 22 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  welcome: { alignItems: 'center', gap: spacing.md },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: font.size.md, lineHeight: 22, textAlign: 'center' },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  hint: { color: colors.textMuted, fontSize: font.size.sm },
  footer: { padding: spacing.xl, gap: spacing.sm },
});
