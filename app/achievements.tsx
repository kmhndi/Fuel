import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAchievementStats, type AchievementStats } from '@/db/achievements';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import type { TKey } from '@/i18n/translations';
import { colors, font, radius, spacing } from '@/theme';

interface Badge {
  icon: keyof typeof Ionicons.glyphMap;
  title: TKey;
  desc: TKey;
  done: (s: AchievementStats) => boolean;
  progress: (s: AchievementStats) => string;
}

const BADGES: Badge[] = [
  { icon: 'restaurant', title: 'ach.firstBite', desc: 'ach.firstBiteD', done: (s) => s.totalMeals >= 1, progress: (s) => `${Math.min(s.totalMeals, 1)}/1` },
  { icon: 'flame', title: 'ach.onRoll', desc: 'ach.onRollD', done: (s) => s.logStreak >= 3, progress: (s) => `${Math.min(s.logStreak, 3)}/3` },
  { icon: 'bonfire', title: 'ach.weekWarrior', desc: 'ach.weekWarriorD', done: (s) => s.logStreak >= 7, progress: (s) => `${Math.min(s.logStreak, 7)}/7` },
  { icon: 'calendar', title: 'ach.committed', desc: 'ach.committedD', done: (s) => s.daysLogged >= 30, progress: (s) => `${Math.min(s.daysLogged, 30)}/30` },
  { icon: 'checkmark-done', title: 'ach.onTargetT', desc: 'ach.onTargetD', done: (s) => s.onTargetDays >= 5, progress: (s) => `${Math.min(s.onTargetDays, 5)}/5` },
  { icon: 'trophy', title: 'ach.dialedIn', desc: 'ach.dialedInD', done: (s) => s.onTargetDays >= 20, progress: (s) => `${Math.min(s.onTargetDays, 20)}/20` },
  { icon: 'water', title: 'ach.hydration', desc: 'ach.hydrationD', done: (s) => s.waterGoalDays >= 7, progress: (s) => `${Math.min(s.waterGoalDays, 7)}/7` },
  { icon: 'scale', title: 'ach.steppingUp', desc: 'ach.steppingUpD', done: (s) => s.weighIns >= 5, progress: (s) => `${Math.min(s.weighIns, 5)}/5` },
  { icon: 'happy', title: 'ach.selfAware', desc: 'ach.selfAwareD', done: (s) => s.checkins >= 5, progress: (s) => `${Math.min(s.checkins, 5)}/5` },
  { icon: 'restaurant-outline', title: 'ach.centurion', desc: 'ach.centurionD', done: (s) => s.totalMeals >= 100, progress: (s) => `${Math.min(s.totalMeals, 100)}/100` },
];

export default function AchievementsScreen() {
  const { goals } = useGoals();
  const { t } = useT();
  const [stats, setStats] = useState<AchievementStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAchievementStats(goals.calorieGoal, goals.waterGoal).then(setStats);
    }, [goals.calorieGoal, goals.waterGoal]),
  );

  const unlocked = stats ? BADGES.filter((b) => b.done(stats)).length : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.count}>{t('ach.unlocked', { n: unlocked, total: BADGES.length })}</Text>
      <View style={styles.grid}>
        {BADGES.map((b) => {
          const done = stats ? b.done(stats) : false;
          return (
            <View key={b.title} style={[styles.badge, done && styles.badgeDone]}>
              <View style={[styles.iconWrap, done && styles.iconWrapDone]}>
                <Ionicons name={b.icon} size={26} color={done ? colors.bg : colors.textMuted} />
              </View>
              <Text style={[styles.title, done && styles.titleDone]} numberOfLines={1}>{t(b.title)}</Text>
              <Text style={styles.desc} numberOfLines={2}>{t(b.desc)}</Text>
              <Text style={[styles.progress, done && { color: colors.accent }]}>
                {done ? t('ach.unlockedTag') : stats ? b.progress(stats) : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  count: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  badge: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    opacity: 0.6,
  },
  badgeDone: { opacity: 1, borderColor: colors.accent },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconWrapDone: { backgroundColor: colors.accent },
  title: { color: colors.textMuted, fontSize: font.size.md, fontWeight: font.weight.semibold },
  titleDone: { color: colors.text },
  desc: { color: colors.textMuted, fontSize: font.size.xs, textAlign: 'center' },
  progress: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.medium, marginTop: spacing.xs },
});
