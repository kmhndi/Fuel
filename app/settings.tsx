import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGoals, saveGoals, clearAllData } from '@/db/settings';
import {
  getPermissionGranted,
  requestNotificationPermission,
} from '@/notifications';
import { useGoals } from '@/state/GoalsContext';
import { Card, Field, GhostButton, PrimaryButton } from '@/components/ui';
import { caloriesFromMacros, macroColors } from '@/nutrition';
import { successFeedback } from '@/haptics';
import { colors, font, spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { refresh } = useGoals();

  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);

  useEffect(() => {
    getGoals().then((g) => {
      setCalorieGoal(String(g.calorieGoal));
      setProteinGoal(String(g.proteinGoal));
      setCarbGoal(String(g.carbGoal));
      setFatGoal(String(g.fatGoal));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPermissionGranted().then(setNotifGranted);
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
    await saveGoals({
      calorieGoal: int(calorieGoal),
      proteinGoal: int(proteinGoal),
      carbGoal: int(carbGoal),
      fatGoal: int(fatGoal),
    });
    await refresh();
    successFeedback();
    setSaving(false);
    router.back();
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
      'This permanently deletes every meal, food, and supplement on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            router.back();
          },
        },
      ],
    );
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
        <Text style={styles.sectionTitle}>Daily goals</Text>
        <Card style={styles.card}>
          <Field
            label="Calories"
            value={calorieGoal}
            onChangeText={(t) => setCalorieGoal(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            suffix="kcal"
          />
          <View style={styles.macrosRow}>
            <View style={styles.cell}>
              <Field
                label="Protein"
                value={proteinGoal}
                onChangeText={(t) => setProteinGoal(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix="g"
              />
            </View>
            <View style={styles.cell}>
              <Field
                label="Carbs"
                value={carbGoal}
                onChangeText={(t) => setCarbGoal(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix="g"
              />
            </View>
            <View style={styles.cell}>
              <Field
                label="Fat"
                value={fatGoal}
                onChangeText={(t) => setFatGoal(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                suffix="g"
              />
            </View>
          </View>
          {macroCalories > 0 ? (
            <Text style={[styles.hint, { color: macroColors.protein }]}>
              Your macro goals total ~{macroCalories.toLocaleString()} kcal
            </Text>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.notifCard}>
          <View style={styles.notifRow}>
            <Ionicons
              name={notifGranted ? 'notifications' : 'notifications-off-outline'}
              size={22}
              color={notifGranted ? colors.accent : colors.danger}
            />
            <Text style={styles.notifText}>
              {notifGranted
                ? 'Reminders are enabled.'
                : 'Reminders are turned off.'}
            </Text>
          </View>
          {!notifGranted ? (
            <GhostButton label="Enable reminders" onPress={enableNotifications} />
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Data</Text>
        <Card>
          <Text style={styles.privacy}>
            Everything stays on this device — no account, no cloud, no tracking.
          </Text>
          <GhostButton label="Clear all data" tone="danger" onPress={confirmClear} />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Save goals" onPress={save} loading={saving} />
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
  sectionTitle: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.md,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  hint: {
    fontSize: font.size.sm,
  },
  notifCard: {
    gap: spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notifText: {
    color: colors.text,
    fontSize: font.size.md,
    flex: 1,
  },
  privacy: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
