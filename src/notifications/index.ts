import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'supplement-reminders';

/**
 * Foreground behaviour: even when Fuel is open, surface the reminder as a
 * banner so a supplement isn't silently missed.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ensure the Android notification channel exists. No-op on other platforms.
 * Must run before scheduling so reminders use the right channel.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Supplement reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Request notification permission if not already granted. Returns whether
 * reminders can actually fire. Simulators/emulators without a device can't
 * receive notifications, so we guard on `Device.isDevice`.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  return status === 'granted';
}

/** Whether notification permission is currently granted. */
export async function getPermissionGranted(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a daily repeating reminder and return its identifier so it can be
 * cancelled later. The caller is responsible for persisting the id.
 */
export async function scheduleDailyReminder(
  name: string,
  dose: string | null,
  hour: number,
  minute: number,
): Promise<string> {
  const body = dose ? `Time to take ${name} (${dose}).` : `Time to take ${name}.`;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 Supplement reminder',
      body,
      ...(Platform.OS === 'android'
        ? { channelId: ANDROID_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Hours at which water reminders fire when enabled. */
const WATER_HOURS = [10, 12, 14, 16, 18, 20];

/** Remove any previously scheduled water reminders (tagged via data.type). */
export async function cancelWaterReminders(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content.data as { type?: string })?.type === 'water')
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // Scheduler unavailable (e.g. web) — nothing to cancel.
  }
}

/**
 * Enable or disable spread-out daily water reminders. When enabling, clears any
 * existing ones first so toggling doesn't stack duplicates.
 */
export async function applyWaterReminders(enabled: boolean): Promise<void> {
  await cancelWaterReminders();
  if (!enabled) return;
  for (const hour of WATER_HOURS) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Hydration check',
        body: 'Time for some water.',
        data: { type: 'water' },
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    }).catch(() => {});
  }
}

/** Cancel every scheduled reminder (used when wiping all data). */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // No scheduler available (e.g. web) — nothing to cancel.
  }
}

/** Cancel a previously scheduled reminder, ignoring unknown ids. */
export async function cancelReminder(
  notificationId: string | null,
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already gone (e.g. cancelled by the OS) — nothing to do.
  }
}
