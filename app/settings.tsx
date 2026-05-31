import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGoals, saveGoals, clearAllData } from '@/db/settings';
import {
  getPermissionGranted,
  requestNotificationPermission,
} from '@/notifications';
import { exportBackup, importBackup } from '@/backup';
import { useGoals } from '@/state/GoalsContext';
import {
  Card,
  Field,
  GhostButton,
  PrimaryButton,
  SegmentedControl,
} from '@/components/ui';
import { caloriesFromMacros, macroColors } from '@/nutrition';
import { displayToKg, kgToDisplay } from '@/health';
import { successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { WeightUnit } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { refresh } = useGoals();

  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [glassMl, setGlassMl] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [goalWeight, setGoalWeight] = useState('');
  const [caffeineLimit, setCaffeineLimit] = useState('');
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
    });
  }, []);

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
    });
    await refresh();
    successFeedback();
    setSaving(false);
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
        <Text style={styles.sectionTitle}>Daily goals</Text>
        <Card style={styles.card}>
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
            <Text style={[styles.hint, { color: macroColors.protein }]}>
              Macro goals total ~{macroCalories.toLocaleString()} kcal
            </Text>
          ) : null}
          <GhostButton label="Not sure? Use the goal calculator" onPress={() => router.push('/goal-calculator')} />
        </Card>

        <Text style={styles.sectionTitle}>Water</Text>
        <Card style={styles.row}>
          <View style={styles.cell}>
            <Field label="Daily goal" value={waterGoal} onChangeText={(t) => setWaterGoal(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="glasses" />
          </View>
          <View style={styles.cell}>
            <Field label="Glass size" value={glassMl} onChangeText={(t) => setGlassMl(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="ml" />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Units</Text>
        <Card>
          <Text style={styles.unitLabel}>Weight</Text>
          <SegmentedControl<WeightUnit>
            value={weightUnit}
            onChange={setWeightUnit}
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
          />
        </Card>

        <Text style={styles.sectionTitle}>Targets</Text>
        <Card style={styles.row}>
          <View style={styles.cell}>
            <Field label="Goal weight" value={goalWeight} onChangeText={(t) => setGoalWeight(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix={weightUnit} />
          </View>
          <View style={styles.cell}>
            <Field label="Caffeine limit" value={caffeineLimit} onChangeText={(t) => setCaffeineLimit(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix="mg" />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.notifCard}>
          <View style={styles.notifRow}>
            <Ionicons name={notifGranted ? 'notifications' : 'notifications-off-outline'} size={22} color={notifGranted ? colors.accent : colors.danger} />
            <Text style={styles.notifText}>
              {notifGranted ? 'Reminders are enabled.' : 'Reminders are turned off.'}
            </Text>
          </View>
          {!notifGranted ? <GhostButton label="Enable reminders" onPress={enableNotifications} /> : null}
        </Card>

        <Text style={styles.sectionTitle}>Backup</Text>
        <Card style={styles.card}>
          <Text style={styles.privacy}>
            Export a copy of everything as a file, or restore from one. Great before reinstalling.
          </Text>
          <View style={styles.row}>
            <View style={styles.cell}>
              <GhostButton label="Export" onPress={onExport} />
            </View>
            <View style={styles.cell}>
              <GhostButton label="Restore" onPress={onImport} />
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Data</Text>
        <Card>
          <Text style={styles.privacy}>
            Everything stays on this device — no account, no cloud, no tracking.
          </Text>
          <GhostButton label="Clear all data" tone="danger" onPress={confirmClear} />
        </Card>

        <Text style={styles.about}>Fuel v{version} · made for me, by me ⚡</Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Save goals" onPress={save} loading={saving || busy} />
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
  notifCard: { gap: spacing.sm },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifText: { color: colors.text, fontSize: font.size.md, flex: 1 },
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
