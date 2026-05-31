import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteSupplement,
  getSupplementsWithStatus,
  markAllTaken,
  setSupplementEnabled,
  setTaken,
} from '@/db/supplements';
import { formatTime } from '@/db/dates';
import { Card, EmptyState } from '@/components/ui';
import { selectionFeedback, successFeedback, tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { SupplementStatus } from '@/types';

export default function SupplementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SupplementStatus[]>([]);

  const load = useCallback(async () => {
    setItems(await getSupplementsWithStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleTaken = useCallback(
    async (item: SupplementStatus) => {
      const next = !item.takenToday;
      if (next) successFeedback();
      else selectionFeedback();
      // Optimistic update, then persist and reconcile (streak may change).
      setItems((prev) =>
        prev.map((s) =>
          s.id === item.id ? { ...s, takenToday: next } : s,
        ),
      );
      await setTaken(item.id, next);
      load();
    },
    [load],
  );

  const toggleReminder = useCallback(
    async (item: SupplementStatus) => {
      tapFeedback();
      const updated = await setSupplementEnabled(item, !item.enabled);
      setItems((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
      );
    },
    [],
  );

  const onRowActions = useCallback(
    (item: SupplementStatus) => {
      Alert.alert(item.name, undefined, [
        {
          text: 'Edit',
          onPress: () => router.push(`/add-supplement?id=${item.id}`),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete supplement',
              `Stop tracking "${item.name}"? This also clears its history.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteSupplement(item);
                    load();
                  },
                },
              ],
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [router, load],
  );

  const onMarkAll = useCallback(async () => {
    successFeedback();
    await markAllTaken();
    load();
  }, [load]);

  const takenCount = items.filter((s) => s.takenToday).length;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          items.length > 0 ? (
            <SummaryCard
              taken={takenCount}
              total={items.length}
              onMarkAll={onMarkAll}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <SupplementRow
            item={item}
            onToggleTaken={() => toggleTaken(item)}
            onToggleReminder={() => toggleReminder(item)}
            onLongPress={() => onRowActions(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Ionicons name="medkit-outline" size={40} color={colors.textMuted} />
            }
            title="No supplements yet"
            subtitle="Add a supplement to get a daily reminder, then check it off to build a streak."
          />
        }
      />

      <Pressable
        onPress={() => {
          tapFeedback();
          router.push('/add-supplement');
        }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          pressed && styles.fabPressed,
        ]}
        accessibilityLabel="Add a supplement"
      >
        <Ionicons name="add" size={32} color={colors.bg} />
      </Pressable>
    </View>
  );
}

function SummaryCard({
  taken,
  total,
  onMarkAll,
}: {
  taken: number;
  total: number;
  onMarkAll: () => void;
}) {
  const pct = total > 0 ? taken / total : 0;
  const allDone = taken === total && total > 0;
  return (
    <Card style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Today</Text>
        <Text style={[styles.summaryCount, allDone && { color: colors.accent }]}>
          {taken} of {total} taken
        </Text>
      </View>
      <View style={styles.summaryTrack}>
        <View style={[styles.summaryFill, { width: `${pct * 100}%` }]} />
      </View>
      {allDone ? (
        <Text style={styles.summaryDone}>All caught up — nice. 🎉</Text>
      ) : (
        <Pressable
          onPress={onMarkAll}
          style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="checkmark-done" size={16} color={colors.accent} />
          <Text style={styles.markAllText}>Mark all taken</Text>
        </Pressable>
      )}
    </Card>
  );
}

function SupplementRow({
  item,
  onToggleTaken,
  onToggleReminder,
  onLongPress,
}: {
  item: SupplementStatus;
  onToggleTaken: () => void;
  onToggleReminder: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onToggleTaken}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.check, item.takenToday && styles.checkOn]}>
        {item.takenToday ? (
          <Ionicons name="checkmark" size={20} color={colors.bg} />
        ) : null}
      </View>

      <View style={styles.rowInfo}>
        <Text
          style={[styles.name, item.takenToday && styles.nameTaken]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons
            name={item.enabled ? 'alarm' : 'alarm-outline'}
            size={13}
            color={item.enabled ? colors.accent : colors.textMuted}
          />
          <Text style={styles.meta}>
            {formatTime(item.hour, item.minute)}
            {item.hour2 != null && item.minute2 != null
              ? ` & ${formatTime(item.hour2, item.minute2)}`
              : ''}
          </Text>
          {item.weekdays ? <Text style={styles.meta}>· {item.weekdays.length}×/wk</Text> : null}
          {item.dose ? <Text style={styles.meta}>· {item.dose}</Text> : null}
          {item.streak > 0 ? (
            <Text style={styles.streak}>🔥 {item.streak}</Text>
          ) : null}
          {item.stock != null ? (
            <Text style={[styles.meta, item.stock <= item.refillAt && styles.lowStock]}>
              · {item.stock} left{item.stock <= item.refillAt ? ' • refill' : ''}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable onPress={onToggleReminder} hitSlop={10} style={styles.bell}>
        <Ionicons
          name={item.enabled ? 'notifications' : 'notifications-off-outline'}
          size={20}
          color={item.enabled ? colors.accent : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  summary: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
  },
  summaryCount: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  summaryTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  summaryFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  summaryDone: {
    color: colors.accent,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  markAllText: {
    color: colors.accent,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    opacity: 0.7,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  rowInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  nameTaken: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  meta: {
    color: colors.textMuted,
    fontSize: font.size.sm,
  },
  streak: {
    color: colors.warning,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    marginLeft: spacing.xs,
  },
  lowStock: { color: colors.danger, fontWeight: font.weight.semibold },
  bell: {
    padding: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
  },
});
