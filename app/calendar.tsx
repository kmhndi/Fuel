import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMonthCalories } from '@/db/meals';
import { toDayKey } from '@/db/dates';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { Card } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen() {
  const { goals } = useGoals();
  const { t } = useT();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data, setData] = useState<Record<string, number>>({});

  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;

  const load = useCallback(async () => {
    setData(await getMonthCalories(ym));
  }, [ym]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const prev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goal = goals.calorieGoal;
  const today = toDayKey();
  const loggedDays = Object.keys(data).length;

  const colorFor = (dayNum: number) => {
    const key = `${ym}-${String(dayNum).padStart(2, '0')}`;
    const cals = data[key];
    if (!cals) return colors.surfaceAlt;
    if (cals > goal) return colors.warning;
    if (cals >= goal * 0.6) return colors.accent;
    return colors.accentDim;
  };

  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={prev} hitSlop={8} style={styles.arrow}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{MONTHS[month]} {year}</Text>
          <Pressable onPress={next} disabled={isFutureMonth} hitSlop={8} style={[styles.arrow, isFutureMonth && styles.disabled]}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        <Card>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekday}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((dayNum, i) => {
              const key = dayNum ? `${ym}-${String(dayNum).padStart(2, '0')}` : '';
              return (
                <View key={i} style={styles.cell}>
                  {dayNum ? (
                    <View style={[styles.day, { backgroundColor: colorFor(dayNum) }, key === today && styles.todayRing]}>
                      <Text style={[styles.dayNum, data[key] ? styles.dayNumOn : null]}>{dayNum}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>

        <Text style={styles.summary}>
          {loggedDays === 1 ? t('cal.dayLogged') : t('cal.daysLogged', { n: loggedDays })}
        </Text>

        <View style={styles.legend}>
          <Legend color={colors.accentDim} label={t('cal.light')} />
          <Legend color={colors.accent} label={t('cal.onTrack')} />
          <Legend color={colors.warning} label={t('cal.over')} />
        </View>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { padding: spacing.xs },
  disabled: { opacity: 0.25 },
  title: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekday: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.medium },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  day: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  todayRing: { borderWidth: 2, borderColor: colors.text },
  dayNum: { color: colors.textMuted, fontSize: font.size.xs },
  dayNumOn: { color: colors.bg, fontWeight: font.weight.bold },
  summary: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { color: colors.textMuted, fontSize: font.size.xs },
});
