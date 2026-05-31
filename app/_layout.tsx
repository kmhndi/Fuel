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
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await ensureAndroidChannel();
        // Ask for notification permission up front so reminders work as soon
        // as the user adds a supplement. Failure here is non-fatal.
        await requestNotificationPermission();
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
    <GoalsProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-meal"
          options={{ presentation: 'modal', title: 'Log a meal' }}
        />
        <Stack.Screen
          name="add-supplement"
          options={{ presentation: 'modal', title: 'New supplement' }}
        />
        <Stack.Screen
          name="add-exercise"
          options={{ presentation: 'modal', title: 'Log exercise' }}
        />
        <Stack.Screen
          name="settings"
          options={{ presentation: 'modal', title: 'Goals & settings' }}
        />
        <Stack.Screen name="weight" options={{ title: 'Weight & body' }} />
        <Stack.Screen name="food-library" options={{ title: 'Food library' }} />
        <Stack.Screen name="meal-search" options={{ title: 'Search meals' }} />
        <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="presets" options={{ title: 'Quick-add presets' }} />
        <Stack.Screen
          name="checkin"
          options={{ presentation: 'modal', title: 'Daily check-in' }}
        />
        <Stack.Screen
          name="goal-calculator"
          options={{ presentation: 'modal', title: 'Goal calculator' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
    </GoalsProvider>
  );
}
