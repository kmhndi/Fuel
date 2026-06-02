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
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        headerTransparent: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        // Floating rounded "bubble" nav, detached from the screen edges.
        tabBarStyle: {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: (insets.bottom || spacing.md) + spacing.xs,
          height: 64,
          borderRadius: radius.xl,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          elevation: 0,
        },
        tabBarItemStyle: { paddingVertical: spacing.sm },
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
          title: t('tabs.today'),
          tabBarLabel: t('tabs.today'),
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
