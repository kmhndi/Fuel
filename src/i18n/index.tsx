import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nManager } from 'react-native';
import { openDatabaseSync } from 'expo-sqlite';
import { setLanguageSetting } from '../db/settings';
import { shiftDay, toDayKey } from '../db/dates';
import { translations, type TKey } from './translations';
import type { Language } from '../types';

/**
 * Read the saved language synchronously at startup so the initial render (and
 * layout direction) is correct. Falls back to English if settings aren't
 * migrated yet.
 */
function readInitialLanguage(): Language {
  try {
    const db = openDatabaseSync('fuel.db');
    const row = db.getFirstSync<{ language: string }>(
      'SELECT language FROM settings WHERE id = 1',
    );
    if (row?.language === 'ar') return 'ar';
  } catch {
    // settings table not migrated yet
  }
  return 'en';
}

const initialLanguage = readInitialLanguage();

// Apply layout direction at startup. Flipping this later needs an app reload,
// so changing language in-app updates text immediately but prompts a restart
// for full right-to-left layout.
I18nManager.allowRTL(true);
I18nManager.forceRTL(initialLanguage === 'ar');

export const isRTL = initialLanguage === 'ar';

type TParams = Record<string, string | number>;

function translate(lang: Language, key: TKey, params?: TParams): string {
  let str: string = translations[lang][key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

/** Localized "Today"/"Yesterday"/short-date label for a YYYY-MM-DD day key. */
function makeFormatDay(lang: Language) {
  return (dayKey: string): string => {
    const today = toDayKey();
    if (dayKey === today) return translate(lang, 'date.today');
    if (dayKey === shiftDay(today, -1)) return translate(lang, 'date.yesterday');
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(
      lang === 'ar' ? 'ar' : undefined,
      { weekday: 'short', month: 'short', day: 'numeric' },
    );
  };
}

interface LanguageContextValue {
  lang: Language;
  /** Translate a key, with optional {placeholder} params. */
  t: (key: TKey, params?: TParams) => string;
  /** Localized relative day label (Today/Yesterday/date). */
  formatDay: (dayKey: string) => string;
  /** Persist + apply a new language. Returns whether a restart is recommended. */
  setLanguage: (lang: Language) => Promise<boolean>;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: initialLanguage,
  t: (key) => translations.en[key] ?? key,
  formatDay: makeFormatDay(initialLanguage),
  setLanguage: async () => false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initialLanguage);

  const setLanguage = useCallback(async (next: Language) => {
    setLang(next);
    await setLanguageSetting(next);
    const needsRestart = I18nManager.isRTL !== (next === 'ar');
    I18nManager.forceRTL(next === 'ar');
    return needsRestart;
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: (key, params) => translate(lang, key, params),
      formatDay: makeFormatDay(lang),
      setLanguage,
    }),
    [lang, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
  return useContext(LanguageContext);
}
