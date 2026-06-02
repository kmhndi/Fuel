import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';
import { colors, radius, spacing, themeMode } from '@/theme';

export default function TabsLayout() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
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
        // Percentage insets keep the bar narrow and centered on any screen width,
        // which clusters the 4 flex:1 icons toward the middle instead of the edges.
        tabBarStyle: {
          position: 'absolute',
          left: '20%',
          right: '20%',
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
      />
    </Tabs>
  );
}
