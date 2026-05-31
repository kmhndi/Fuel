import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { collectBackup, restoreBackup, type BackupData } from './db/backup';
import { toDayKey } from './db/dates';

/**
 * Write all data to a JSON file and open the share sheet so the user can save
 * it to Files, AirDrop it, email it, etc. Returns false if sharing is
 * unavailable (e.g. web).
 */
export async function exportBackup(): Promise<boolean> {
  const data = await collectBackup();
  const json = JSON.stringify(data, null, 2);
  const uri = `${FileSystem.cacheDirectory}fuel-backup-${toDayKey()}.json`;
  await FileSystem.writeAsStringAsync(uri, json);

  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Fuel backup',
    UTI: 'public.json',
  });
  return true;
}

/**
 * Let the user pick a backup file and restore it. Returns 'cancelled' if they
 * dismiss the picker, otherwise resolves once the data is restored (or throws
 * with a readable message on a bad file).
 */
export async function importBackup(): Promise<'restored' | 'cancelled'> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return 'cancelled';

  const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
  let parsed: BackupData;
  try {
    parsed = JSON.parse(text) as BackupData;
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  await restoreBackup(parsed);
  return 'restored';
}
