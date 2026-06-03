import { clearWhoopDaily } from '../../db/whoop';
import { deleteExercisesBySource } from '../../db/exercise';
import { setWhoopConnection } from '../../db/settings';
import { clearTokens } from './tokens';

export { connectWhoop, type ConnectResult } from './auth';
export { syncWhoop, type SyncResult } from './sync';
export { isWhoopConfigured } from './config';
export { WhoopAuthError } from './api';

/**
 * Fully unlink WHOOP: clear stored tokens, remove WHOOP-sourced exercise rows
 * and daily energy totals, and flip the connection flag off.
 */
export async function disconnectWhoop(): Promise<void> {
  await clearTokens();
  await clearWhoopDaily();
  await deleteExercisesBySource('whoop');
  await setWhoopConnection(false, null);
}
