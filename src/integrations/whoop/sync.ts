import { toDayKey } from '../../db/dates';
import { upsertExternalExercise } from '../../db/exercise';
import { upsertWhoopDaily } from '../../db/whoop';
import { setWhoopConnection } from '../../db/settings';
import { fetchCycles, fetchWorkouts, kjToKcal } from './api';

export interface SyncResult {
  workouts: number;
  days: number;
}

/**
 * Pull WHOOP workouts (per-bout) and daily cycles (total energy) for the last
 * `sinceDays` days and upsert them into Fuel. Workouts land in the exercise
 * table (deduped by WHOOP id); cycle totals land in `whoop_daily` and become
 * the authoritative energy-out for those days. Throws WhoopAuthError if the
 * link is no longer valid.
 */
export async function syncWhoop(sinceDays = 7): Promise<SyncResult> {
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 86_400_000);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const workouts = await fetchWorkouts(startIso, endIso);
  for (const w of workouts) {
    const kj = w.score?.kilojoule;
    if (kj == null) continue;
    await upsertExternalExercise({
      externalId: `whoop:workout:${w.id}`,
      source: 'whoop',
      name: w.sport_name ? `WHOOP · ${w.sport_name}` : 'WHOOP workout',
      calories: kjToKcal(kj),
      day: toDayKey(new Date(w.start)),
      loggedAt: w.start,
    });
  }

  const cycles = await fetchCycles(startIso, endIso);
  let days = 0;
  for (const c of cycles) {
    const kj = c.score?.kilojoule;
    if (kj == null) continue;
    await upsertWhoopDaily(
      toDayKey(new Date(c.start)),
      kjToKcal(kj),
      c.score?.strain ?? null,
    );
    days++;
  }

  await setWhoopConnection(true, new Date().toISOString());
  return { workouts: workouts.length, days };
}
