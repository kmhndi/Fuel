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
 * Schedule reminders for a supplement and return all created identifiers.
 * One notification per time per selected weekday (or daily when `weekdays`
 * is null/empty/all seven). The caller persists the returned ids.
 */
export async function scheduleReminders(
  name: string,
  dose: string | null,
  times: { hour: number; minute: number }[],
  weekdays: number[] | null,
): Promise<string[]> {
  const body = dose ? `Time to take ${name} (${dose}).` : `Time to take ${name}.`;
  const content = {
    title: '💊 Supplement reminder',
    body,
    ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
  };
  const everyDay = !weekdays || weekdays.length === 0 || weekdays.length === 7;
  const ids: string[] = [];

  for (const t of times) {
    if (everyDay) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: t.hour,
          minute: t.minute,
        },
      }).catch(() => null);
      if (id) ids.push(id);
    } else {
      for (const wd of weekdays!) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            // expo weekday is 1=Sunday..7=Saturday; our wd is 0=Sun..6=Sat.
            weekday: wd + 1,
            hour: t.hour,
            minute: t.minute,
          },
        }).catch(() => null);
        if (id) ids.push(id);
      }
    }
  }
  return ids;
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

/** Cancel a set of previously scheduled reminders, ignoring unknown ids. */
export async function cancelReminders(ids: string[] | null): Promise<void> {
  if (!ids?.length) return;
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
}
