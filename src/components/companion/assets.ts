import type { ImageSourcePropType } from 'react-native';
import type { CharacterId } from './characters';
import type { CompanionMood } from './mood';

/**
 * Hand-drawn PNG frames. Volt (the dragon) ships illustrated art; the other
 * characters fall back to the code-drawn SVG. Volt has 4 frames, mapped to cover
 * all 6 moods (worried reuses idle; milestone reuses celebration).
 */
const VOLT: Record<CompanionMood, ImageSourcePropType> = {
  sleepy: require('../../../assets/companion/volt-sleepy.png'),
  content: require('../../../assets/companion/volt-idle.png'),
  happy: require('../../../assets/companion/volt-happy.png'),
  celebrating: require('../../../assets/companion/volt-celebration.png'),
  worried: require('../../../assets/companion/volt-idle.png'),
  milestone: require('../../../assets/companion/volt-celebration.png'),
};

const PNG_FRAMES: Partial<Record<CharacterId, Record<CompanionMood, ImageSourcePropType>>> = {
  dragon: VOLT,
};

/** The PNG frame for a character+mood, or null if the character has no art. */
export function pngFrame(character: CharacterId, mood: CompanionMood): ImageSourcePropType | null {
  return PNG_FRAMES[character]?.[mood] ?? null;
}
