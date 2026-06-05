import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/db';
import {
  ensureAndroidChannel,
  requestNotificationPermission,
} from '@/notifications';
import { GoalsProvider } from '@/state/GoalsContext';
import { LanguageProvider, useT } from '@/i18n';
import { ScreenBackground } from '@/components/ScreenBackground';
import { colors, themeMode } from '@/theme';
import { drainPendingWater, updateWidgetSnapshot, useWidgetSync } from '@/widgets';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { t } = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        // Modals & pushed screens are opaque deep-indigo so the screen behind
        // them doesn't bleed through. The tab group stays transparent so the
        // root gradient shows on the main screens.
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen
        name="add-meal"
        options={{ presentation: 'modal', title: t('title.logMeal') }}
      />
      <Stack.Screen
        name="add-supplement"
        options={{ presentation: 'modal', title: t('title.newSupplement') }}
      />
      <Stack.Screen
        name="add-exercise"
        options={{ presentation: 'modal', title: t('title.logExercise') }}
      />
      <Stack.Screen
        name="roulette"
        options={{ presentation: 'modal', title: t('title.roulette') }}
      />
      <Stack.Screen
        name="settings"
        options={{ presentation: 'modal', title: t('title.settings') }}
      />
      <Stack.Screen name="weight" options={{ title: t('title.weight') }} />
      <Stack.Screen name="food-library" options={{ title: t('title.foodLibrary') }} />
      <Stack.Screen name="meal-search" options={{ title: t('title.searchMeals') }} />
      <Stack.Screen name="calendar" options={{ title: t('title.calendar') }} />
      <Stack.Screen name="achievements" options={{ title: t('title.achievements') }} />
      <Stack.Screen name="presets" options={{ title: t('title.presets') }} />
      <Stack.Screen name="categories" options={{ title: t('title.categories') }} />
      <Stack.Screen name="weekday-goals" options={{ title: t('title.weekdayGoals') }} />
      <Stack.Screen
        name="checkin"
        options={{ presentation: 'modal', title: t('title.checkin') }}
      />
      <Stack.Screen
        name="share-day"
        options={{ presentation: 'modal', title: t('title.shareDay') }}
      />
      <Stack.Screen
        name="wrapped"
        options={{ presentation: 'modal', title: t('title.wrapped') }}
      />
      <Stack.Screen
        name="goal-calculator"
        options={{ presentation: 'modal', title: t('title.goalCalculator') }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // Reconcile widget-originated water taps whenever the app returns to foreground.
  useWidgetSync();

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await ensureAndroidChannel();
        // Ask for notification permission up front so reminders work as soon
        // as the user adds a supplement. Failure here is non-fatal.
        await requestNotificationPermission();
        // Apply any glasses tapped from a widget while closed, then push a
        // fresh snapshot so the widgets reflect today's totals on launch.
        await drainPendingWater();
        await updateWidgetSnapshot();
      } finally {
        setReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenBackground />
      <LanguageProvider>
        <GoalsProvider>
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
          <RootNavigator />
        </GoalsProvider>
      </LanguageProvider>
    </View>
  );
}
