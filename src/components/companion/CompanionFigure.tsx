import { Image } from 'react-native';
import { pngFrame } from './assets';
import { DEFAULT_CHARACTER, type CharacterId } from './characters';
import type { CompanionMood } from './mood';

/**
 * The companion drawing: a hand-drawn PNG frame for the chosen character + mood,
 * rendered square. Animation/positioning live in the wrapper; this is a pure,
 * re-usable picture. (Only Volt ships art today; falls back to the default.)
 */
export function CompanionFigure({
  character,
  mood,
  width,
}: {
  character: CharacterId;
  mood: CompanionMood;
  width: number;
}) {
  const frame = pngFrame(character, mood) ?? pngFrame(DEFAULT_CHARACTER, mood);
  if (!frame) return null;
  return <Image source={frame} style={{ width, height: width }} resizeMode="contain" />;
}
