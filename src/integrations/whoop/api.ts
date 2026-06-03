import { WHOOP_API_BASE } from './config';
import { getValidAccessToken } from './tokens';

/** Thrown when WHOOP rejects auth (no token / 401) — caller should disconnect. */
export class WhoopAuthError extends Error {
  constructor() {
    super('WHOOP authentication failed');
    this.name = 'WhoopAuthError';
  }
}

const KJ_PER_KCAL = 4.184;

/** Convert WHOOP kilojoules to kilocalories. */
export function kjToKcal(kj: number): number {
  return Math.round(kj / KJ_PER_KCAL);
}

/** A WHOOP workout (one bout). `score.kilojoule` is the bout's energy burn. */
export interface WhoopWorkout {
  id: number | string;
  start: string;
  end: string;
  sport_name?: string;
  score?: { kilojoule?: number; strain?: number } | null;
}

/** A WHOOP physiological cycle (≈ a day). `score.kilojoule` is total day burn. */
export interface WhoopCycle {
  id: number | string;
  start: string;
  end?: string | null;
  score?: { kilojoule?: number; strain?: number } | null;
}

interface Paged<T> {
  records: T[];
  next_token?: string;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await getValidAccessToken();
  if (!token) throw new WhoopAuthError();
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new WhoopAuthError();
  if (!res.ok) throw new Error(`WHOOP API ${res.status}`);
  return (await res.json()) as T;
}

/** Fetch every page of a WHOOP collection within a time window (capped). */
async function fetchPaged<T>(
  path: string,
  start: string,
  end: string,
): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | undefined;
  // Cap pages so a runaway loop can't hammer the API.
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ start, end, limit: '25' });
    if (nextToken) q.set('nextToken', nextToken);
    const data = await authedGet<Paged<T>>(`${path}?${q.toString()}`);
    out.push(...(data.records ?? []));
    if (!data.next_token) break;
    nextToken = data.next_token;
  }
  return out;
}

export function fetchWorkouts(start: string, end: string): Promise<WhoopWorkout[]> {
  return fetchPaged<WhoopWorkout>('/v1/activity/workout', start, end);
}

export function fetchCycles(start: string, end: string): Promise<WhoopCycle[]> {
  return fetchPaged<WhoopCycle>('/v1/cycle', start, end);
}
