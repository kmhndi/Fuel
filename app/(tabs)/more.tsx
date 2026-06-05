import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';
import { tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

interface Item {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  href: Href;
}

export default function MoreScreen() {
  const router = useRouter();
  const { t } = useT();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const items: Item[] = [
    { icon: 'scale-outline', title: t('title.weight'), subtitle: t('more.subWeight'), href: '/weight' },
    { icon: 'search-outline', title: t('title.searchMeals'), subtitle: t('more.subSearch'), href: '/meal-search' },
    { icon: 'fast-food-outline', title: t('title.foodLibrary'), subtitle: t('more.subFood'), href: '/food-library' },
    { icon: 'calendar-outline', title: t('title.calendar'), subtitle: t('more.subCalendar'), href: '/calendar' },
    { icon: 'trophy-outline', title: t('title.achievements'), subtitle: t('more.subAch'), href: '/achievements' },
    { icon: 'sparkles-outline', title: t('more.wrapped'), subtitle: t('more.subWrapped'), href: '/wrapped' },
    { icon: 'share-social-outline', title: t('more.shareToday'), subtitle: t('more.subShare'), href: '/share-day' },
    { icon: 'flash-outline', title: t('title.presets'), subtitle: t('more.subPresets'), href: '/presets' },
    { icon: 'pricetags-outline', title: t('title.categories'), subtitle: t('more.subCategories'), href: '/categories' },
    { icon: 'calculator-outline', title: t('title.goalCalculator'), subtitle: t('more.subCalc'), href: '/goal-calculator' },
    { icon: 'options-outline', title: t('title.settings'), subtitle: t('more.subSettings'), href: '/settings' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {items.map((item) => (
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
        <Text style={styles.footerSub}>v{version} · {t('more.footer')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, paddingBottom: 132, gap: spacing.sm },
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
