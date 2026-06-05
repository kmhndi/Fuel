import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { buildWrapped, type PersonalityKey, type WrappedData } from '@/wrapped';
import { FlameCompanion } from '@/components/FlameCompanion';
import { EmptyState, GhostButton, PrimaryButton } from '@/components/ui';
import { useGoals } from '@/state/GoalsContext';
import { useT } from '@/i18n';
import { tapFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

const WINDOW_DAYS = 30;
const MIN_LOGGED_DAYS = 5;

type SlideType = 'intro' | 'consistency' | 'calories' | 'protein' | 'foods' | 'summary';
const SLIDE_TYPES: SlideType[] = ['intro', 'consistency', 'calories', 'protein', 'foods', 'summary'];

export default function WrappedScreen() {
  const router = useRouter();
  const { t } = useT();
  const { goals } = useGoals();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    buildWrapped(WINDOW_DAYS, goals)
      .then(setData)
      .finally(() => setLoading(false));
  }, [goals]);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('wrapped.title') });
      } else {
        Alert.alert(t('wrapped.title'), t('share.couldNotShareMsg'));
      }
    } catch {
      Alert.alert(t('share.couldNotShare'), t('share.couldNotShareMsg'));
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data || data.loggedDays < MIN_LOGGED_DAYS) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <EmptyState
            icon={<Ionicons name="sparkles-outline" size={40} color={colors.textMuted} />}
            title={t('wrapped.notEnoughTitle')}
            subtitle={t('wrapped.notEnoughSub')}
          />
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <GhostButton label={t('wrapped.close')} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const personalityTitle = (p: PersonalityKey): string => {
    switch (p) {
      case 'machine':
        return t('wrapped.pMachine');
      case 'protein':
        return t('wrapped.pProtein');
      case 'explorer':
        return t('wrapped.pExplorer');
      default:
        return t('wrapped.pBalanced');
    }
  };
  const personalitySub = (p: PersonalityKey): string => {
    switch (p) {
      case 'machine':
        return t('wrapped.pMachineSub');
      case 'protein':
        return t('wrapped.pProteinSub');
      case 'explorer':
        return t('wrapped.pExplorerSub');
      default:
        return t('wrapped.pBalancedSub');
    }
  };

  const slideContent = (type: SlideType): ReactNode => {
    switch (type) {
      case 'intro':
        return (
          <Hero
            icon="sparkles"
            value={`${data.days}`}
            valueSub={t('wrapped.introDays')}
            caption={t('wrapped.introSub')}
          />
        );
      case 'consistency':
        return (
          <>
            <Hero
              icon="checkmark-done"
              value={`${data.loggedDays}`}
              valueSub={t('wrapped.ofDays', { n: data.days })}
              caption={t('wrapped.consistencyCaption')}
            />
            <View style={styles.streakRow}>
              <FlameCompanion streak={data.bestStreak} goalHit={false} size={24} />
              <Text style={styles.streakText}>{t('wrapped.bestStreak', { n: data.bestStreak })}</Text>
            </View>
          </>
        );
      case 'calories':
        return (
          <Hero
            icon="flame"
            value={data.totalCalories.toLocaleString()}
            valueSub={t('common.kcal')}
            caption={`${t('wrapped.caloriesAvg', { n: data.avgCalories.toLocaleString() })} · ${t('wrapped.onTarget', { n: data.onTargetDays })}`}
          />
        );
      case 'protein':
        return (
          <Hero
            icon="barbell"
            value={`${data.totalProtein.toLocaleString()}g`}
            valueSub={t('wrapped.proteinLabel')}
            caption={t('wrapped.proteinAvg', { n: data.avgProtein })}
          />
        );
      case 'foods':
        return (
          <View style={styles.foodsWrap}>
            <Text style={styles.slideTitle}>{t('wrapped.foodsTitle')}</Text>
            {data.topFoods.length > 0 ? (
              data.topFoods.slice(0, 5).map((f, i) => (
                <View key={f.name} style={styles.foodRow}>
                  <Text style={styles.foodRank}>{i + 1}</Text>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.foodCount}>{t('wrapped.foodTimes', { n: f.count })}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.caption}>{t('wrapped.foodsEmpty')}</Text>
            )}
          </View>
        );
      case 'summary':
        return (
          <View style={styles.summaryWrap}>
            <View ref={cardRef} collapsable={false} style={styles.shareCard}>
              <View style={styles.brandRow}>
                <Ionicons name="flash" size={18} color={colors.accent} />
                <Text style={styles.brand}>{t('wrapped.title')}</Text>
              </View>
              <Text style={styles.shareWindow}>{t('wrapped.introTitle', { n: data.days })}</Text>
              <View style={styles.personaRow}>
                <Ionicons name={personaIcon(data.personality)} size={26} color={colors.accent} />
                <Text style={styles.personaTitle}>{personalityTitle(data.personality)}</Text>
              </View>
              <Text style={styles.personaSub}>{personalitySub(data.personality)}</Text>
              <View style={styles.shareStats}>
                <ShareStat value={`${data.loggedDays}`} label={t('wrapped.statLogged')} />
                <ShareStat value={`${data.bestStreak}`} label={t('wrapped.statStreak')} />
                <ShareStat value={data.avgCalories.toLocaleString()} label={t('wrapped.statKcal')} />
                <ShareStat value={`${data.onTargetDays}`} label={t('wrapped.statOnTarget')} />
              </View>
            </View>
            <View style={styles.shareButtons}>
              <PrimaryButton label={t('wrapped.share')} onPress={share} loading={sharing} />
              <GhostButton label={t('wrapped.done')} onPress={() => router.back()} />
            </View>
          </View>
        );
    }
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<SlideType>) => (
    <Slide active={index === current} width={width} top={insets.top + spacing.xxl} bottom={insets.bottom}>
      {slideContent(item)}
    </Slide>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={SLIDE_TYPES}
        keyExtractor={(s) => s}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== current) {
            tapFeedback();
            setCurrent(i);
          }
        }}
      />
      <View style={[styles.dots, { top: insets.top + spacing.md }]} pointerEvents="none">
        {SLIDE_TYPES.map((s, i) => (
          <View key={s} style={[styles.dot, i === current && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function Slide({
  active,
  width,
  top,
  bottom,
  children,
}: {
  active: boolean;
  width: number;
  top: number;
  bottom: number;
  children: ReactNode;
}) {
  const a = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: active ? 1 : 0,
      duration: active ? 460 : 0,
      useNativeDriver: true,
    }).start();
  }, [active, a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  return (
    <View style={{ width }}>
      <Animated.View
        style={[
          styles.slide,
          { paddingTop: top, paddingBottom: bottom + spacing.lg, opacity: a, transform: [{ translateY }] },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function Hero({
  icon,
  value,
  valueSub,
  caption,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  valueSub: string;
  caption: string;
}) {
  return (
    <View style={styles.hero}>
      <Ionicons name={icon} size={40} color={colors.accent} />
      <Text style={styles.heroValue}>{value}</Text>
      <Text style={styles.heroValueSub}>{valueSub}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function ShareStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.shareStat}>
      <Text style={styles.shareStatValue}>{value}</Text>
      <Text style={styles.shareStatLabel}>{label}</Text>
    </View>
  );
}

function personaIcon(p: PersonalityKey): keyof typeof Ionicons.glyphMap {
  switch (p) {
    case 'machine':
      return 'flame';
    case 'protein':
      return 'barbell';
    case 'explorer':
      return 'compass';
    default:
      return 'leaf';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  footer: { padding: spacing.lg },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroValue: {
    color: colors.text,
    fontSize: 64,
    fontWeight: font.weight.heavy,
    letterSpacing: -1,
    marginTop: spacing.md,
  },
  heroValueSub: { color: colors.accent, fontSize: font.size.lg, fontWeight: font.weight.semibold, marginTop: -spacing.xs },
  caption: { color: colors.textMuted, fontSize: font.size.md, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm },
  slideTitle: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold, marginBottom: spacing.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streakText: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  foodsWrap: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.sm },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  foodRank: { color: colors.accent, fontSize: font.size.lg, fontWeight: font.weight.heavy, width: 22 },
  foodName: { flex: 1, color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  foodCount: { color: colors.textMuted, fontSize: font.size.sm },
  summaryWrap: { alignSelf: 'stretch', gap: spacing.lg },
  shareCard: {
    backgroundColor: '#16142E',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brand: { color: colors.accent, fontSize: font.size.md, fontWeight: font.weight.bold },
  shareWindow: { color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.sm },
  personaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personaTitle: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy, flexShrink: 1 },
  personaSub: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20, marginBottom: spacing.md },
  shareStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  shareStat: { minWidth: '40%' },
  shareStatValue: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold },
  shareStatLabel: { color: colors.textMuted, fontSize: font.size.xs, textTransform: 'uppercase', letterSpacing: 1 },
  shareButtons: { gap: spacing.xs },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.accent, width: 20 },
});
