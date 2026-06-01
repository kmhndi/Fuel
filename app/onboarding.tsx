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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveGoals } from '@/db/settings';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { Field, GhostButton, PrimaryButton } from '@/components/ui';
import { caloriesFromMacros } from '@/nutrition';
import { successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Language } from '@/types';

const STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { refresh } = useGoals();
  const { t, lang, setLanguage } = useT();
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
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 ? (
            <View style={styles.form}>
              <View style={styles.logo}>
                <Ionicons name="flash" size={44} color={colors.accent} />
              </View>
              <Text style={styles.title}>{t('onb.chooseLanguage')}</Text>
              <LanguageButton
                label="English"
                active={lang === 'en'}
                onPress={() => setLanguage('en')}
              />
              <LanguageButton
                label="العربية"
                active={lang === 'ar'}
                onPress={() => setLanguage('ar')}
              />
              <Text style={styles.hint}>{t('onb.languageHint')}</Text>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.welcome}>
              <View style={styles.logo}>
                <Ionicons name="flash" size={48} color={colors.accent} />
              </View>
              <Text style={styles.title}>{t('onb.welcomeTitle')}</Text>
              <Text style={styles.body}>{t('onb.welcomeBody')}</Text>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.form}>
              <Text style={styles.title}>{t('onb.goalsTitle')}</Text>
              <Text style={styles.body}>{t('onb.goalsBody')}</Text>
              <Field
                label={t('onb.calories')}
                value={calorieGoal}
                onChangeText={(v) => setCalorieGoal(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix={t('common.kcal')}
              />
              <View style={styles.row}>
                <View style={styles.cell}>
                  <Field label={t('onb.protein')} value={proteinGoal} onChangeText={(v) => setProteinGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                </View>
                <View style={styles.cell}>
                  <Field label={t('onb.carbs')} value={carbGoal} onChangeText={(v) => setCarbGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                </View>
                <View style={styles.cell}>
                  <Field label={t('onb.fat')} value={fatGoal} onChangeText={(v) => setFatGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
                </View>
              </View>
              {macroCalories > 0 ? (
                <Text style={styles.hint}>{t('onb.macrosTotal', { n: macroCalories.toLocaleString() })}</Text>
              ) : null}
              <Field
                label={t('onb.waterGoal')}
                value={waterGoal}
                onChangeText={(v) => setWaterGoal(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix={t('onb.glasses')}
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.welcome}>
              <View style={styles.logo}>
                <Ionicons name="checkmark" size={48} color={colors.accent} />
              </View>
              <Text style={styles.title}>{t('onb.doneTitle')}</Text>
              <Text style={styles.body}>{t('onb.doneBody')}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step < STEPS - 1 ? (
            <PrimaryButton label={t('common.continue')} onPress={() => setStep((s) => s + 1)} />
          ) : (
            <PrimaryButton label={t('onb.start')} onPress={finish} />
          )}
          {step === 1 ? <GhostButton label={t('common.skip')} onPress={finish} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LanguageButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.langButton, active && styles.langButtonActive]}
    >
      <Text style={[styles.langText, active && styles.langTextActive]}>{label}</Text>
      {active ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
    </Pressable>
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
    alignSelf: 'center',
  },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: font.size.md, lineHeight: 22, textAlign: 'center' },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  hint: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' },
  footer: { padding: spacing.xl, gap: spacing.sm },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  langButtonActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  langText: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  langTextActive: { color: colors.accent },
});
