import { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDaySummary } from '@/db/meals';
import { getWater } from '@/db/water';
import { getExerciseTotal } from '@/db/exercise';
import { getSupplementsWithStatus } from '@/db/supplements';
import { toDayKey } from '@/db/dates';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { PrimaryButton } from '@/components/ui';
import { effectiveCalorieGoal } from '@/health';
import { macroColors } from '@/nutrition';
import { colors, font, radius, spacing } from '@/theme';

export default function ShareDayScreen() {
  const { goals } = useGoals();
  const { t, lang } = useT();
  const cardRef = useRef<View>(null);
  const [data, setData] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0,
    exercise: 0,
    suppTaken: 0,
    suppTotal: 0,
  });
  const [sharing, setSharing] = useState(false);

  const today = toDayKey();
  const goal = effectiveCalorieGoal(goals, today);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [summary, water, exercise, supps] = await Promise.all([
          getDaySummary(today),
          getWater(today),
          getExerciseTotal(today),
          getSupplementsWithStatus(),
        ]);
        setData({
          calories: summary.calories,
          protein: summary.protein,
          carbs: summary.carbs,
          fat: summary.fat,
          water,
          exercise,
          suppTaken: supps.filter((s) => s.takenToday).length,
          suppTotal: supps.length,
        });
      })();
    }, [today]),
  );

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your day' });
      } else {
        Alert.alert('Saved', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert(t('share.couldNotShare'), t('share.couldNotShareMsg'));
    } finally {
      setSharing(false);
    }
  };

  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(
    lang === 'ar' ? 'ar' : undefined,
    { weekday: 'long', month: 'long', day: 'numeric' },
  );
  const remaining = goal - data.calories;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* The captured card */}
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <View style={styles.brandRow}>
          <Ionicons name="flash" size={20} color={colors.accent} />
          <Text style={styles.brand}>Fuel</Text>
        </View>
        <Text style={styles.date}>{dateLabel}</Text>

        <View style={styles.bigRow}>
          <Text style={styles.bigValue}>{data.calories.toLocaleString()}</Text>
          <Text style={styles.bigUnit}>/ {goal.toLocaleString()} {t('common.kcal')}</Text>
        </View>
        <Text style={styles.remaining}>
          {remaining >= 0
            ? t('share.under', { n: remaining.toLocaleString() })
            : t('share.over', { n: Math.abs(remaining).toLocaleString() })}
        </Text>

        <View style={styles.macros}>
          <Macro label={t('meal.protein')} value={data.protein} color={macroColors.protein} />
          <Macro label={t('meal.carbs')} value={data.carbs} color={macroColors.carbs} />
          <Macro label={t('meal.fat')} value={data.fat} color={macroColors.fat} />
        </View>

        <View style={styles.statsRow}>
          <MiniStat icon="water" label={`${data.water} ${t('trends.glasses')}`} />
          {data.exercise > 0 ? (
            <MiniStat icon="barbell" label={t('today.exerciseBurned', { n: data.exercise })} />
          ) : null}
          {data.suppTotal > 0 ? (
            <MiniStat icon="medkit" label={`${data.suppTaken}/${data.suppTotal}`} />
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label={t('share.shareImage')} onPress={share} loading={sharing} />
      </View>
    </ScrollView>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.miniText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brand: { color: colors.accent, fontSize: font.size.md, fontWeight: font.weight.bold },
  date: { color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  bigValue: { color: colors.text, fontSize: 44, fontWeight: font.weight.bold },
  bigUnit: { color: colors.textMuted, fontSize: font.size.md },
  remaining: { color: colors.accent, fontSize: font.size.sm, fontWeight: font.weight.medium, marginBottom: spacing.lg },
  macros: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.lg },
  macro: { alignItems: 'flex-start', gap: 2 },
  macroDot: { width: 18, height: 4, borderRadius: 2, marginBottom: spacing.xs },
  macroValue: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  macroLabel: { color: colors.textMuted, fontSize: font.size.xs },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  miniText: { color: colors.textMuted, fontSize: font.size.sm },
  footer: { marginTop: spacing.xl },
});
