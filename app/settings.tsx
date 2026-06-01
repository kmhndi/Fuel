import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGoals, saveGoals, clearAllData } from '@/db/settings';
import {
  applyWaterReminders,
  getPermissionGranted,
  requestNotificationPermission,
} from '@/notifications';
import {
  setAlternateAppIcon,
  supportsAlternateIcons,
} from 'expo-alternate-app-icons';
import { exportBackup, importBackup } from '@/backup';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import {
  Card,
  Field,
  GhostButton,
  PrimaryButton,
  SegmentedControl,
} from '@/components/ui';
import { caloriesFromMacros, macroColors } from '@/nutrition';
import { displayToKg, kgToDisplay } from '@/health';
import { selectionFeedback, successFeedback } from '@/haptics';
import { ACCENT_CHOICES, ACCENT_ICON_NAME, colors, font, radius, spacing } from '@/theme';
import type { Language, ThemeMode, WeightUnit } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { refresh } = useGoals();
  const { t, lang, setLanguage } = useT();

  const onChangeLanguage = async (value: Language) => {
    selectionFeedback();
    const needsRestart = await setLanguage(value);
    if (needsRestart) {
      Alert.alert(t('set.language'), t('set.languageRestart'));
    }
  };

  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [glassMl, setGlassMl] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [goalWeight, setGoalWeight] = useState('');
  const [caffeineLimit, setCaffeineLimit] = useState('');
  const [restingBurn, setRestingBurn] = useState('');
  const [waterReminders, setWaterReminders] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [accent, setAccent] = useState<string>(ACCENT_CHOICES[0]);
  const [appearanceChanged, setAppearanceChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);

  useEffect(() => {
    getGoals().then((g) => {
      setCalorieGoal(String(g.calorieGoal));
      setProteinGoal(String(g.proteinGoal));
      setCarbGoal(String(g.carbGoal));
      setFatGoal(String(g.fatGoal));
      setWaterGoal(String(g.waterGoal));
      setGlassMl(String(g.glassMl));
      setWeightUnit(g.weightUnit);
      setGoalWeight(g.goalWeightKg != null ? kgToDisplay(g.goalWeightKg, g.weightUnit).toFixed(1) : '');
      setCaffeineLimit(String(g.caffeineLimit));
      setRestingBurn(g.restingBurn != null ? String(g.restingBurn) : '');
      setWaterReminders(g.waterReminders);
      setTheme(g.theme);
      setAccent(g.accent);
    });
  }, []);

  const toggleWaterReminders = async (value: boolean) => {
    setWaterReminders(value);
    await saveGoals({ waterReminders: value });
    await applyWaterReminders(value);
    await refresh();
  };

  useFocusEffect(
    useCallback(() => {
      getPermissionGranted().then(setNotifGranted);
      // Re-read in case the goal calculator updated the calorie target.
      getGoals().then((g) => setCalorieGoal(String(g.calorieGoal)));
    }, []),
  );

  const int = (s: string) => {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };
  const macroCalories = caloriesFromMacros(
    int(proteinGoal),
    int(carbGoal),
    int(fatGoal),
  );

  const save = async () => {
    setSaving(true);
    const gw = Number.parseFloat(goalWeight);
    await saveGoals({
      calorieGoal: int(calorieGoal),
      proteinGoal: int(proteinGoal),
      carbGoal: int(carbGoal),
      fatGoal: int(fatGoal),
      waterGoal: Math.max(1, int(waterGoal)),
      glassMl: Math.max(50, int(glassMl)),
      weightUnit,
      goalWeightKg: Number.isFinite(gw) && gw > 0 ? displayToKg(gw, weightUnit) : null,
      caffeineLimit: Math.max(0, int(caffeineLimit)),
      restingBurn: restingBurn.trim() ? Math.max(0, int(restingBurn)) : null,
      theme,
      accent,
    });
    // Switch the home-screen app icon to match the chosen accent.
    if (appearanceChanged && Platform.OS !== 'web' && supportsAlternateIcons) {
      try {
        await setAlternateAppIcon(ACCENT_ICON_NAME[accent] ?? null);
      } catch {
        // Device may not support alternate icons — ignore.
      }
    }
    await refresh();
    successFeedback();
    setSaving(false);
    if (appearanceChanged) {
      Alert.alert('Saved', 'Your new accent is set. Reopen Fuel to see it across the app and the home-screen icon.');
    }
    router.back();
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const shared = await exportBackup();
      if (!shared) {
        Alert.alert('Export ready', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Export failed', 'Could not create the backup file.');
    } finally {
      setBusy(false);
    }
  };

  const onImport = () => {
    Alert.alert(
      'Restore from backup',
      'This replaces ALL current data with the contents of the backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await importBackup();
              if (result === 'restored') {
                await refresh();
                successFeedback();
                Alert.alert('Restored', 'Your data has been restored from the backup.');
              }
            } catch (e) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : 'Bad file.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (!granted) {
      Alert.alert(
        'Notifications are off',
        'Enable notifications for Fuel in your device settings to receive supplement reminders.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear all data',
      'This permanently deletes every meal, food, supplement, weigh-in and water log on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await refresh();
            router.back();
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>{t('set.dailyGoals')}</Text>
        <Card style={styles.card}>
          <Field
            label={t('onb.calories')}
            value={calorieGoal}
            onChangeText={(t) => setCalorieGoal(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            suffix="kcal"
          />
          <View style={styles.row}>
            <View style={styles.cell}>
              <Field label={t('meal.protein')} value={proteinGoal} onChangeText={(t) => setProteinGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
            </View>
            <View style={styles.cell}>
              <Field label={t('meal.carbs')} value={carbGoal} onChangeText={(t) => setCarbGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
            </View>
            <View style={styles.cell}>
              <Field label={t('meal.fat')} value={fatGoal} onChangeText={(t) => setFatGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="g" />
            </View>
          </View>
          {macroCalories > 0 ? (
            <Text style={[styles.hint, { color: macroColors.protein }]}>
              {t('set.macroTotal', { n: macroCalories.toLocaleString() })}
            </Text>
          ) : null}
          <GhostButton label={t('set.calcLink')} onPress={() => router.push('/goal-calculator')} />
          <GhostButton label={t('set.weekdayLink')} onPress={() => router.push('/weekday-goals')} />
        </Card>

        <Text style={styles.sectionTitle}>{t('set.water')}</Text>
        <Card style={styles.row}>
          <View style={styles.cell}>
            <Field label={t('set.waterDailyGoal')} value={waterGoal} onChangeText={(v) => setWaterGoal(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix={t('set.glasses')} />
          </View>
          <View style={styles.cell}>
            <Field label={t('set.glassSize')} value={glassMl} onChangeText={(t) => setGlassMl(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="ml" />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('set.units')}</Text>
        <Card>
          <Text style={styles.unitLabel}>{t('set.weight')}</Text>
          <SegmentedControl<WeightUnit>
            value={weightUnit}
            onChange={setWeightUnit}
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
          />
        </Card>

        <Text style={styles.sectionTitle}>{t('set.language')}</Text>
        <Card>
          <SegmentedControl<Language>
            value={lang}
            onChange={onChangeLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
        </Card>

        <Text style={styles.sectionTitle}>{t('set.appearance')}</Text>
        <Card style={styles.card}>
          <Text style={styles.unitLabel}>{t('set.theme')}</Text>
          <SegmentedControl<ThemeMode>
            value={theme}
            onChange={(value) => {
              setTheme(value);
              setAppearanceChanged(true);
            }}
            options={[
              { value: 'dark', label: t('set.themeDark') },
              { value: 'light', label: t('set.themeLight') },
            ]}
          />
          <Text style={styles.unitLabel}>{t('set.accent')}</Text>
          <View style={styles.swatches}>
            {ACCENT_CHOICES.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  selectionFeedback();
                  setAccent(c);
                  setAppearanceChanged(true);
                }}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  accent === c && styles.swatchActive,
                ]}
              >
                {accent === c ? <Ionicons name="checkmark" size={18} color="#000" /> : null}
              </Pressable>
            ))}
          </View>
          {appearanceChanged ? (
            <Text style={styles.hint}>Reopen Fuel to apply the new look.</Text>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>{t('set.targets')}</Text>
        <Card style={styles.row}>
          <View style={styles.cell}>
            <Field label={t('set.goalWeight')} value={goalWeight} onChangeText={(t) => setGoalWeight(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={weightUnit} />
          </View>
          <View style={styles.cell}>
            <Field label={t('set.caffeineLimit')} value={caffeineLimit} onChangeText={(t) => setCaffeineLimit(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="mg" />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('set.energy')}</Text>
        <Card style={styles.card}>
          <Field
            label={t('set.restingBurn')}
            value={restingBurn}
            onChangeText={(t) => setRestingBurn(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            suffix="kcal/day"
            placeholder="Auto from profile"
          />
          <Text style={styles.privacy}>
            {t('set.restingLead')}
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>{t('set.notifications')}</Text>
        <Card style={styles.notifCard}>
          <View style={styles.notifRow}>
            <Ionicons name={notifGranted ? 'notifications' : 'notifications-off-outline'} size={22} color={notifGranted ? colors.accent : colors.danger} />
            <Text style={styles.notifText}>
              {notifGranted ? t('set.notifEnabled') : t('set.notifDisabled')}
            </Text>
          </View>
          {!notifGranted ? <GhostButton label={t('set.enableReminders')} onPress={enableNotifications} /> : null}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{t('set.waterReminders')}</Text>
              <Text style={styles.switchSub}>{t('set.waterRemindersSub')}</Text>
            </View>
            <Switch
              value={waterReminders}
              onValueChange={toggleWaterReminders}
              trackColor={{ false: colors.surfaceAlt, true: colors.accentDim }}
              thumbColor={waterReminders ? colors.accent : colors.textMuted}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('set.backup')}</Text>
        <Card style={styles.card}>
          <Text style={styles.privacy}>
            {t('set.backupLead')}
          </Text>
          <View style={styles.row}>
            <View style={styles.cell}>
              <GhostButton label={t('set.export')} onPress={onExport} />
            </View>
            <View style={styles.cell}>
              <GhostButton label={t('set.restore')} onPress={onImport} />
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('set.data')}</Text>
        <Card>
          <Text style={styles.privacy}>
            {t('set.privacyLead')}
          </Text>
          <GhostButton label={t('set.clearAll')} tone="danger" onPress={confirmClear} />
        </Card>

        <Text style={styles.about}>Fuel v{version} · made for me, by me ⚡</Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={t('set.saveGoals')} onPress={save} loading={saving || busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  hint: { fontSize: font.size.sm },
  unitLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginBottom: spacing.sm,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.text },
  notifCard: { gap: spacing.sm },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifText: { color: colors.text, fontSize: font.size.md, flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchTitle: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  switchSub: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  privacy: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  about: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
