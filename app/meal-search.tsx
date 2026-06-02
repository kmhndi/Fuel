import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUsedTags, searchMeals } from '@/db/meals';
import { Field, EmptyState } from '@/components/ui';
import { mealTypeMeta } from '@/nutrition';
import { useT } from '@/i18n';
import { selectionFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';
import type { Meal } from '@/types';

export default function MealSearchScreen() {
  const router = useRouter();
  const { t, formatDay } = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Meal[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    getUsedTags().then(setTags);
  }, []);

  const run = useCallback(async (q: string) => {
    setResults(await searchMeals(q, 150));
  }, []);

  useEffect(() => {
    run(query);
  }, [query, run]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Field
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          autoFocus
          autoCorrect={false}
        />
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  selectionFeedback();
                  setQuery(query === t ? '' : t);
                }}
                style={[styles.tag, query === t && styles.tagActive]}
              >
                <Text style={[styles.tagText, query === t && styles.tagTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/add-meal?id=${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Ionicons
              name={mealTypeMeta[item.mealType]?.icon ?? 'restaurant-outline'}
              size={18}
              color={colors.textMuted}
            />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>
                {formatDay(item.day)} · {item.calories} {t('common.kcal')}
                {item.tag ? ` · ${item.tag}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="search-outline" size={40} color={colors.textMuted} />}
            title={query ? t('search.emptyMatch') : t('search.empty')}
            subtitle={t('search.emptySub')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  tagActive: { backgroundColor: colors.accentDim },
  tagText: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.medium },
  tagTextActive: { color: colors.accent },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
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
  info: { flex: 1 },
  name: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium },
  meta: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
});
