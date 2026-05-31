import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteSupplement,
  getSupplements,
  setSupplementEnabled,
} from '@/db/supplements';
import { formatTime } from '@/db/dates';
import { EmptyState } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import type { Supplement } from '@/types';

export default function SupplementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [supplements, setSupplements] = useState<Supplement[]>([]);

  const load = useCallback(async () => {
    setSupplements(await getSupplements());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = useCallback(async (supplement: Supplement, value: boolean) => {
    // Optimistically reflect the switch, then persist + (un)schedule.
    setSupplements((prev) =>
      prev.map((s) => (s.id === supplement.id ? { ...s, enabled: value } : s)),
    );
    const updated = await setSupplementEnabled(supplement, value);
    setSupplements((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
  }, []);

  const confirmDelete = useCallback(
    (supplement: Supplement) => {
      Alert.alert('Delete supplement', `Stop tracking "${supplement.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSupplement(supplement);
            load();
          },
        },
      ]);
    },
    [load],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={supplements}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SupplementRow
            supplement={item}
            onToggle={(value) => toggle(item, value)}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="medkit-outline" size={40} color={colors.textMuted} />}
            title="No supplements yet"
            subtitle="Add a supplement and Fuel will remind you to take it at the same time every day."
          />
        }
      />

      <Pressable
        onPress={() => router.push('/add-supplement')}
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

function SupplementRow({
  supplement,
  onToggle,
  onLongPress,
}: {
  supplement: Supplement;
  onToggle: (value: boolean) => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowInfo}>
        <Text style={styles.name} numberOfLines={1}>
          {supplement.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons
            name="alarm-outline"
            size={14}
            color={supplement.enabled ? colors.accent : colors.textMuted}
          />
          <Text
            style={[
              styles.time,
              { color: supplement.enabled ? colors.accent : colors.textMuted },
            ]}
          >
            {formatTime(supplement.hour, supplement.minute)}
          </Text>
          {supplement.dose ? (
            <Text style={styles.dose}> · {supplement.dose}</Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={supplement.enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceAlt, true: colors.accentDim }}
        thumbColor={supplement.enabled ? colors.accent : colors.textMuted}
      />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  rowInfo: {
    flex: 1,
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  dose: {
    color: colors.textMuted,
    fontSize: font.size.sm,
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
