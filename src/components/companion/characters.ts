import type { MascotCharacter } from '@/types';

/** A selectable companion creature. Re-uses the persisted domain type. */
export type CharacterId = MascotCharacter;

/**
 * Characters available to pick. Only Volt (the dragon) ships art today; more can
 * be added later by dropping PNG frames into `assets.ts` and listing them here.
 */
export const CHARACTER_IDS: CharacterId[] = ['dragon'];

export const DEFAULT_CHARACTER: CharacterId = 'dragon';
