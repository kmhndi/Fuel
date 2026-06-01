import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addPreset, deletePreset, getPresets } from '@/db/presets';
import { Card, EmptyState, Field, PrimaryButton } from '@/components/ui';
import { useT } from '@/i18n';
import { successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Preset } from '@/types';

export default function PresetsScreen() {
  const { t } = useT();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setPresets(await getPresets());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cals = Number.parseInt(calories, 10);
  const canSave = name.trim().length > 0 && Number.isFinite(cals) && cals > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const p = Number.parseFloat(protein);
    await addPreset(name.trim(), cals, {
      protein: Number.isFinite(p) ? p : 0,
      carbs: 0,
      fat: 0,
    });
    successFeedback();
    setName('');
    setCalories('');
    setProtein('');
    setSaving(false);
    load();
  };

  const onDelete = (preset: Preset) => {
    Alert.alert(t('preset.deleteTitle'), t('preset.deleteMsg', { name: preset.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deletePreset(preset.id);
          load();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t('preset.lead')}</Text>

        <Card style={styles.form}>
          <Field label={t('preset.name')} value={name} onChangeText={setName} placeholder={t('preset.namePlaceholder')} />
          <View style={styles.row}>
            <View style={styles.cell}>
              <Field label={t('preset.calories')} value={calories} onChangeText={(v) => setCalories(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" suffix={t('common.kcal')} />
            </View>
            <View style={styles.cell}>
              <Field label={t('preset.protein')} value={protein} onChangeText={(v) => setProtein(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="g" />
            </View>
          </View>
          <PrimaryButton label={t('preset.add')} onPress={save} disabled={!canSave} loading={saving} />
        </Card>

        {presets.length > 0 ? (
          <View style={styles.list}>
            {presets.map((p) => (
              <Pressable
                key={p.id}
                onLongPress={() => onDelete(p)}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{p.name}</Text>
                  <Text style={styles.itemMeta}>
                    {p.calories} {t('common.kcal')}{p.protein ? ` · P ${Math.round(p.protein)}` : ''}
                  </Text>
                </View>
                <Ionicons name="flash" size={18} color={colors.accent} />
              </Pressable>
            ))}
            <Text style={styles.hint}>{t('preset.longPress')}</Text>
          </View>
        ) : (
          <EmptyState
            icon={<Ionicons name="flash-outline" size={40} color={colors.textMuted} />}
            title={t('preset.empty')}
            subtitle={t('preset.emptySub')}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  lead: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  itemName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  itemMeta: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  hint: { color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.xs },
});
