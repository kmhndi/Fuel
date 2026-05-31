import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

interface Item {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  href: Href;
}

const ITEMS: Item[] = [
  { icon: 'scale-outline', title: 'Weight & body', subtitle: 'Weigh-ins, measurements, goal weight', href: '/weight' },
  { icon: 'search-outline', title: 'Search meals', subtitle: 'Find anything you have logged', href: '/meal-search' },
  { icon: 'fast-food-outline', title: 'Food library', subtitle: 'Manage your saved foods & favorites', href: '/food-library' },
  { icon: 'calculator-outline', title: 'Goal calculator', subtitle: 'Estimate your calorie target (TDEE)', href: '/goal-calculator' },
  { icon: 'options-outline', title: 'Goals & settings', subtitle: 'Targets, units, water, backup', href: '/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.title}
          onPress={() => {
            tapFeedback();
            router.push(item.href);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={22} color={colors.accent} />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Fuel ⚡</Text>
        <Text style={styles.footerSub}>
          v{version} · private & on-device. No account, no cloud.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  subtitle: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
  footerText: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  footerSub: { color: colors.textMuted, fontSize: font.size.xs, textAlign: 'center' },
});
