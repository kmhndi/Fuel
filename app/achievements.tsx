import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAchievementStats, type AchievementStats } from '@/db/achievements';
import { useGoals } from '@/state/GoalsContext';
import { colors, font, radius, spacing } from '@/theme';

interface Badge {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  done: (s: AchievementStats) => boolean;
  progress: (s: AchievementStats) => string;
}

const BADGES: Badge[] = [
  { icon: 'restaurant', title: 'First bite', desc: 'Log your first meal', done: (s) => s.totalMeals >= 1, progress: (s) => `${Math.min(s.totalMeals, 1)}/1` },
  { icon: 'flame', title: 'On a roll', desc: '3-day logging streak', done: (s) => s.logStreak >= 3, progress: (s) => `${Math.min(s.logStreak, 3)}/3` },
  { icon: 'bonfire', title: 'Week warrior', desc: '7-day logging streak', done: (s) => s.logStreak >= 7, progress: (s) => `${Math.min(s.logStreak, 7)}/7` },
  { icon: 'calendar', title: 'Committed', desc: 'Log 30 different days', done: (s) => s.daysLogged >= 30, progress: (s) => `${Math.min(s.daysLogged, 30)}/30` },
  { icon: 'checkmark-done', title: 'On target', desc: 'Hit your calorie goal 5 days', done: (s) => s.onTargetDays >= 5, progress: (s) => `${Math.min(s.onTargetDays, 5)}/5` },
  { icon: 'trophy', title: 'Dialed in', desc: '20 on-target days', done: (s) => s.onTargetDays >= 20, progress: (s) => `${Math.min(s.onTargetDays, 20)}/20` },
  { icon: 'water', title: 'Hydration hero', desc: 'Hit your water goal 7 days', done: (s) => s.waterGoalDays >= 7, progress: (s) => `${Math.min(s.waterGoalDays, 7)}/7` },
  { icon: 'scale', title: 'Stepping up', desc: 'Log 5 weigh-ins', done: (s) => s.weighIns >= 5, progress: (s) => `${Math.min(s.weighIns, 5)}/5` },
  { icon: 'happy', title: 'Self aware', desc: '5 daily check-ins', done: (s) => s.checkins >= 5, progress: (s) => `${Math.min(s.checkins, 5)}/5` },
  { icon: 'restaurant-outline', title: 'Centurion', desc: 'Log 100 meals', done: (s) => s.totalMeals >= 100, progress: (s) => `${Math.min(s.totalMeals, 100)}/100` },
];

export default function AchievementsScreen() {
  const { goals } = useGoals();
  const [stats, setStats] = useState<AchievementStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAchievementStats(goals.calorieGoal, goals.waterGoal).then(setStats);
    }, [goals.calorieGoal, goals.waterGoal]),
  );

  const unlocked = stats ? BADGES.filter((b) => b.done(stats)).length : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.count}>{unlocked} of {BADGES.length} unlocked</Text>
      <View style={styles.grid}>
        {BADGES.map((b) => {
          const done = stats ? b.done(stats) : false;
          return (
            <View key={b.title} style={[styles.badge, done && styles.badgeDone]}>
              <View style={[styles.iconWrap, done && styles.iconWrapDone]}>
                <Ionicons name={b.icon} size={26} color={done ? colors.bg : colors.textMuted} />
              </View>
              <Text style={[styles.title, done && styles.titleDone]} numberOfLines={1}>{b.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>{b.desc}</Text>
              <Text style={[styles.progress, done && { color: colors.accent }]}>
                {done ? 'Unlocked' : stats ? b.progress(stats) : ''}
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
