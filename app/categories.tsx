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
import { addCategory, deleteCategory, getCategories } from '@/db/categories';
import { Card, Field, PrimaryButton } from '@/components/ui';
import { useT } from '@/i18n';
import { selectionFeedback, successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { MealCategory } from '@/types';

const ICONS = [
  'sunny-outline',
  'partly-sunny-outline',
  'moon-outline',
  'cafe-outline',
  'nutrition-outline',
  'barbell-outline',
  'pizza-outline',
  'ice-cream-outline',
  'fast-food-outline',
  'leaf-outline',
] as const;

export default function CategoriesScreen() {
  const { t } = useT();
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICONS[4]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setCategories(await getCategories());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await addCategory(name.trim(), icon);
    successFeedback();
    setName('');
    setSaving(false);
    load();
  };

  const onDelete = (cat: MealCategory) => {
    if (categories.length <= 1) {
      Alert.alert(t('cat.keepOne'), t('cat.keepOneMsg'));
      return;
    }
    Alert.alert(t('cat.deleteTitle'), t('cat.deleteMsg', { name: cat.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
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
        <Text style={styles.lead}>{t('cat.lead')}</Text>

        <Card style={styles.form}>
          <Field label={t('cat.new')} value={name} onChangeText={setName} placeholder={t('cat.newPlaceholder')} />
          <Text style={styles.iconLabel}>{t('cat.icon')}</Text>
          <View style={styles.icons}>
            {ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => {
                  selectionFeedback();
                  setIcon(ic);
                }}
                style={[styles.iconChip, icon === ic && styles.iconChipActive]}
              >
                <Ionicons name={ic} size={20} color={icon === ic ? colors.bg : colors.text} />
              </Pressable>
            ))}
          </View>
          <PrimaryButton label={t('cat.add')} onPress={save} disabled={!name.trim()} loading={saving} />
        </Card>

        <View style={styles.list}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onLongPress={() => onDelete(cat)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.accent} />
              <Text style={styles.itemName}>{cat.name}</Text>
            </Pressable>
          ))}
          <Text style={styles.hint}>{t('cat.longPress')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.md },
  lead: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  form: { gap: spacing.md },
  iconLabel: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.medium },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: { backgroundColor: colors.accent },
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
  hint: { color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.xs },
});
