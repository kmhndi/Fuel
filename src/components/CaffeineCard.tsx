import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';
import { useT } from '../i18n';
import { tapFeedback } from '../haptics';
import { colors, font, radius, spacing } from '../theme';

const COFFEE_BROWN = '#C4845C';

const QUICK = [
  { label: 'Coffee', mg: 95 },
  { label: 'Espresso', mg: 63 },
  { label: 'Tea', mg: 47 },
];

/** Compact daily caffeine tracker with quick-add buttons against a limit. */
export function CaffeineCard({
  mg,
  limit,
  onAdd,
  onReset,
}: {
  mg: number;
  limit: number;
  onAdd: (mg: number) => void;
  onReset: () => void;
}) {
  const { t } = useT();
  const pct = limit > 0 ? Math.min(mg / limit, 1) : 0;
  const over = mg > limit;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="cafe" size={18} color={COFFEE_BROWN} />
          <Text style={styles.title}>{t('today.caffeine')}</Text>
        </View>
        <Text style={[styles.count, over && { color: colors.danger }]}>
          {mg} / {limit} mg
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : COFFEE_BROWN },
          ]}
        />
      </View>

      <View style={styles.controls}>
        {QUICK.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => {
              tapFeedback();
              onAdd(q.mg);
            }}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.chipText}>+{q.label}</Text>
          </Pressable>
        ))}
        {mg > 0 ? (
          <Pressable onPress={onReset} hitSlop={8} style={styles.reset}>
            <Ionicons name="refresh" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  count: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.medium },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.7 },
  chipText: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
  reset: { marginLeft: 'auto', padding: spacing.xs },
});
