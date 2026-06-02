import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ExtensionStorage } from '@bacons/apple-targets';
import { APP_GROUP, SNAPSHOT_KEY } from './config';
import type { WidgetSnapshot } from './types';

/**
 * The snapshot is stored as a JSON string in two places depending on platform:
 *  - iOS: App Group UserDefaults via `ExtensionStorage` (read by the SwiftUI
 *    widget). `ExtensionStorage` no-ops when the native module is absent, so it
 *    is safe to import/call on Android & web.
 *  - Android: a small JSON file the headless widget task can read without the
 *    app's SQLite connection.
 */

const ANDROID_PATH = (FileSystem.documentDirectory ?? '') + 'widget-snapshot.json';

let iosStore: ExtensionStorage | null = null;
function iosStorage(): ExtensionStorage {
  if (!iosStore) iosStore = new ExtensionStorage(APP_GROUP);
  return iosStore;
}

export async function writeSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  const json = JSON.stringify(snapshot);
  if (Platform.OS === 'ios') {
    iosStorage().set(SNAPSHOT_KEY, json);
  } else if (Platform.OS === 'android') {
    await FileSystem.writeAsStringAsync(ANDROID_PATH, json);
  }
}

export async function readSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    if (Platform.OS === 'ios') {
      const raw = iosStorage().get(SNAPSHOT_KEY);
      return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
    }
    if (Platform.OS === 'android') {
      const info = await FileSystem.getInfoAsync(ANDROID_PATH);
      if (!info.exists) return null;
      const text = await FileSystem.readAsStringAsync(ANDROID_PATH);
      return JSON.parse(text) as WidgetSnapshot;
    }
  } catch {
    // Corrupt/missing snapshot — treat as none.
  }
  return null;
}

/** Tell WidgetKit to refresh all timelines (iOS only; no-op elsewhere). */
export function reloadIosWidgets(): void {
  if (Platform.OS === 'ios') ExtensionStorage.reloadWidget();
}
