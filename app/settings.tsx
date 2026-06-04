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
  connectWhoop,
  disconnectWhoop,
  isWhoopConfigured,
  syncWhoop,
  WhoopAuthError,
} from '@/integrations/whoop';
import { updateWidgetSnapshot } from '@/widgets';
import {
  applyEngagementReminders,
  applyWaterReminders,
  getPermissionGranted,
  requestNotificationPermission,
} from '@/notifications';
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

/**
 * Lazily load the alternate-app-icons native module. It's guarded so a missing
 * native binding (e.g. an out-of-date dev build) throws here and is swallowed,
 * instead of throwing at module import and taking the whole Settings route down
 * with it (expo-router drops a route whose module fails to load). The accent
 * icon switch simply no-ops when the module isn't available.
 */
type AltIcons = typeof import('expo-alternate-app-icons');
function altIcons(): AltIcons | null {
  try {
    return require('expo-alternate-app-icons') as AltIcons;
  } catch {
    return null;
  }
}

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
  const [mealReminders, setMealReminders] = useState(false);
  const [eveningReminder, setEveningReminder] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [accent, setAccent] = useState<string>(ACCENT_CHOICES[0]);
  const [appearanceChanged, setAppearanceChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);
  const [whoopConnected, setWhoopConnected] = useState(false);
  const [whoopLastSync, setWhoopLastSync] = useState<string | null>(null);
  const [whoopBusy, setWhoopBusy] = useState(false);

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
      setMealReminders(g.mealReminders);
      setEveningReminder(g.eveningReminder);
      setTheme(g.theme);
      setAccent(g.accent);
      setWhoopConnected(g.whoopConnected);
      setWhoopLastSync(g.whoopLastSync);
    });
  }, []);

  const toggleWaterReminders = async (value: boolean) => {
    setWaterReminders(value);
    await saveGoals({ waterReminders: value });
    await applyWaterReminders(value);
    await refresh();
  };

  const engagementCopy = () => ({
    mealTitle: t('notif.mealTitle'),
    mealBody: t('notif.mealBody'),
    eveningTitle: t('notif.eveningTitle'),
    eveningBody: t('notif.eveningBody'),
  });

  const toggleMealReminders = async (value: boolean) => {
    setMealReminders(value);
    await saveGoals({ mealReminders: value });
    await applyEngagementReminders({ meal: value, evening: eveningReminder }, engagementCopy());
    await refresh();
  };

  const toggleEveningReminder = async (value: boolean) => {
    setEveningReminder(value);
    await saveGoals({ eveningReminder: value });
    await applyEngagementReminders({ meal: mealReminders, evening: value }, engagementCopy());
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
    const alt = altIcons();
    if (appearanceChanged && Platform.OS !== 'web' && alt?.supportsAlternateIcons) {
      try {
        await alt.setAlternateAppIcon(ACCENT_ICON_NAME[accent] ?? null);
      } catch {
        // Device may not support alternate icons — ignore.
      }
    }
    await refresh();
    await updateWidgetSnapshot();
    successFeedback();
    setSaving(false);
    if (appearanceChanged) {
      Alert.alert(t('set.savedTitle'), t('set.savedAccentMsg'));
    }
    router.back();
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const shared = await exportBackup();
      if (!shared) {
        Alert.alert(t('set.exportReady'), t('set.exportReadyMsg'));
      }
    } catch {
      Alert.alert(t('set.exportFailed'), t('set.exportFailedMsg'));
    } finally {
      setBusy(false);
    }
  };

  const onImport = () => {
    Alert.alert(
      t('set.restoreTitle'),
      t('set.restoreMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('set.chooseFile'),
          onPress: async () => {
            setBusy(true);
            try {
              const result = await importBackup();
              if (result === 'restored') {
                await refresh();
                successFeedback();
                Alert.alert(t('set.restored'), t('set.restoredMsg'));
              }
            } catch (e) {
              Alert.alert(t('set.restoreFailed'), e instanceof Error ? e.message : t('set.badFile'));
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
        t('set.notifOffTitle'),
        t('set.notifOffMsg'),
        [
          { text: t('set.notNow'), style: 'cancel' },
          { text: t('set.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const refreshWhoopState = async () => {
    const g = await getGoals();
    setWhoopConnected(g.whoopConnected);
    setWhoopLastSync(g.whoopLastSync);
  };

  const onConnectWhoop = async () => {
    if (whoopBusy) return;
    if (!isWhoopConfigured()) {
      Alert.alert(t('whoop.unavailableTitle'), t('whoop.unavailableMsg'));
      return;
    }
    setWhoopBusy(true);
    try {
      const result = await connectWhoop();
      if (result === 'connected') {
        await syncWhoop();
        await refreshWhoopState();
        await refresh();
        successFeedback();
        Alert.alert(t('whoop.connectedTitle'), t('whoop.connectedMsg'));
      } else if (result === 'error') {
        Alert.alert(t('whoop.errorTitle'), t('whoop.errorMsg'));
      }
    } catch {
      Alert.alert(t('whoop.errorTitle'), t('whoop.errorMsg'));
    } finally {
      setWhoopBusy(false);
    }
  };

  const onSyncWhoop = async () => {
    if (whoopBusy) return;
    setWhoopBusy(true);
    try {
      await syncWhoop();
      await refreshWhoopState();
      await refresh();
      successFeedback();
    } catch (e) {
      if (e instanceof WhoopAuthError) {
        await disconnectWhoop();
        await refreshWhoopState();
        await refresh();
        Alert.alert(t('whoop.reauthTitle'), t('whoop.reauthMsg'));
      } else {
        Alert.alert(t('whoop.errorTitle'), t('whoop.errorMsg'));
      }
    } finally {
      setWhoopBusy(false);
    }
  };

  const onDisconnectWhoop = () => {
    Alert.alert(t('whoop.disconnectTitle'), t('whoop.disconnectMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('whoop.disconnect'),
        style: 'destructive',
        onPress: async () => {
          setWhoopBusy(true);
          try {
            await disconnectWhoop();
            await refreshWhoopState();
            await refresh();
          } finally {
            setWhoopBusy(false);
          }
        },
      },
    ]);
  };

  const confirmClear = () => {
    Alert.alert(
      t('set.clearTitle'),
      t('set.clearMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('set.deleteEverything'),
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
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{t('set.mealReminders')}</Text>
              <Text style={styles.switchSub}>{t('set.mealRemindersSub')}</Text>
            </View>
            <Switch
              value={mealReminders}
              onValueChange={toggleMealReminders}
              trackColor={{ false: colors.surfaceAlt, true: colors.accentDim }}
              thumbColor={mealReminders ? colors.accent : colors.textMuted}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{t('set.eveningReminder')}</Text>
              <Text style={styles.switchSub}>{t('set.eveningReminderSub')}</Text>
            </View>
            <Switch
              value={eveningReminder}
              onValueChange={toggleEveningReminder}
              trackColor={{ false: colors.surfaceAlt, true: colors.accentDim }}
              thumbColor={eveningReminder ? colors.accent : colors.textMuted}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('whoop.section')}</Text>
        <Card style={styles.card}>
          <View style={styles.notifRow}>
            <Ionicons
              name={whoopConnected ? 'fitness' : 'fitness-outline'}
              size={22}
              color={whoopConnected ? colors.accent : colors.textMuted}
            />
            <Text style={styles.notifText}>
              {whoopConnected ? t('whoop.connected') : t('whoop.notConnected')}
            </Text>
          </View>
          <Text style={styles.privacy}>{t('whoop.lead')}</Text>
          {whoopConnected ? (
            <>
              {whoopLastSync ? (
                <Text style={styles.hint}>
                  {t('whoop.lastSync', {
                    when: new Date(whoopLastSync).toLocaleString(),
                  })}
                </Text>
              ) : null}
              <View style={styles.row}>
                <View style={styles.cell}>
                  <GhostButton label={t('whoop.syncNow')} onPress={onSyncWhoop} />
                </View>
                <View style={styles.cell}>
                  <GhostButton
                    label={t('whoop.disconnect')}
                    tone="danger"
                    onPress={onDisconnectWhoop}
                  />
                </View>
              </View>
            </>
          ) : (
            <GhostButton label={t('whoop.connect')} onPress={onConnectWhoop} />
          )}
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

        <Text style={styles.about}>{t('set.about', { v: version })}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={t('set.saveGoals')} onPress={save} loading={saving || busy || whoopBusy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
