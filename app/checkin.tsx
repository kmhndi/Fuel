import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getCheckIn, saveCheckIn } from '@/db/checkins';
import { toDayKey } from '@/db/dates';
import { Field, PrimaryButton } from '@/components/ui';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

const MOODS = ['😟', '🙁', '😐', '🙂', '😄'];

export default function CheckInScreen() {
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    getCheckIn(toDayKey()).then((c) => {
      if (!c) return;
      setMood(c.mood);
      setEnergy(c.energy);
      setNote(c.note ?? '');
    });
  }, []);

  const save = async () => {
    await saveCheckIn(toDayKey(), mood, energy, note);
    successFeedback();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>How's your mood?</Text>
        <View style={styles.moods}>
          {MOODS.map((emoji, i) => (
            <Pressable
              key={i}
              onPress={() => {
                selectionFeedback();
                setMood(i + 1);
              }}
              style={[styles.mood, mood === i + 1 && styles.moodActive]}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Energy level</Text>
        <View style={styles.energy}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                selectionFeedback();
                setEnergy(n);
              }}
              style={[styles.energyDot, energy != null && n <= energy && styles.energyOn]}
            >
              <Text style={[styles.energyText, energy != null && n <= energy && styles.energyTextOn]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="How was the day?"
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Save check-in" onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  label: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold, marginTop: spacing.sm },
  moods: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  mood: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  moodEmoji: { fontSize: 26 },
  energy: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  energyDot: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyOn: { backgroundColor: colors.accent },
  energyText: { color: colors.textMuted, fontSize: font.size.md, fontWeight: font.weight.semibold },
  energyTextOn: { color: colors.bg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
