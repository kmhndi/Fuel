import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, Tabs, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';
import { colors, radius, spacing, themeMode } from '@/theme';

export default function TabsLayout() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Debug-only: tap the More tab 10× in quick succession to replay onboarding.
  const moreTaps = useRef(0);
  const lastMoreTap = useRef(0);
  const onMoreTabPress = () => {
    if (!__DEV__) return;
    const now = Date.now();
    moreTaps.current = now - lastMoreTap.current > 1500 ? 1 : moreTaps.current + 1;
    lastMoreTap.current = now;
    if (moreTaps.current >= 10) {
      moreTaps.current = 0;
      router.push('/onboarding');
    }
  };
  return (
    <Tabs
      screenOptions={{
        // Glassy frosted header (blur over the gradient), not a solid band.
        headerStyle: { backgroundColor: 'transparent' },
        headerTransparent: false,
        headerBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              tint={themeMode === 'light' ? 'light' : 'dark'}
              intensity={50}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: themeMode === 'light' ? 'rgba(255,255,255,0.25)' : 'rgba(11,10,31,0.25)' },
              ]}
            />
          </View>
        ),
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        // Floating rounded "bubble" nav: icons only, centered, detached from edges.
        // Use start/end (NOT left/right): BottomTabBar hardcodes start:0/end:0 on
        // the container, and start/end win over left/right in RN — so left/right
        // insets get ignored. 10% each keeps the bar ~80% wide and centered —
        // detached from the edges, but wide enough that the 4 icons get
        // comfortable spacing instead of looking cramped.
        tabBarStyle: {
          position: 'absolute',
          start: '10%',
          end: '10%',
          bottom: (insets.bottom || spacing.md) + spacing.xs,
          height: 58,
          // Clear the framework's safe-area padding so the icon row fills the
          // full pill height (the `bottom` offset already lifts it clear of the
          // home indicator). Without this, paddingBottom pushes icons upward.
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          borderRadius: radius.pill,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          elevation: 0,
        },
        tabBarItemStyle: { height: 58 },
        // Vertically center the icon. Each item's button fills the pill and lays
        // out with justifyContent:'flex-start' (icon-only tabs still reserve the
        // absent label's space), pinning the icon to the top. Auto top+bottom
        // margins on the icon wrapper absorb that free space equally → centered.
        tabBarIconStyle: { marginTop: 'auto', marginBottom: 'auto' },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              tint={themeMode === 'light' ? 'light' : 'dark'}
              intensity={70}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: themeMode === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(30,27,75,0.28)' },
              ]}
            />
          </View>
        ),
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" color={color} size={size} />
          ),
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={12} style={{ marginRight: spacing.lg }}>
                {({ pressed }) => (
                  <Ionicons
                    name="settings-outline"
                    size={22}
                    color={pressed ? colors.accent : colors.text}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="supplements"
        options={{
          title: t('tabs.supplements'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.trends'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" color={color} size={size} />
          ),
        }}
        listeners={{ tabPress: onMoreTabPress }}
      />
    </Tabs>
  );
}
