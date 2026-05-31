import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Thin wrappers around expo-haptics that silently no-op on web and swallow
 * errors, so call sites can fire-and-forget without guards.
 */
export function tapFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

export function selectionFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}
