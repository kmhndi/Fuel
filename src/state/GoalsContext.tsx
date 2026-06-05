import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getGoals } from '../db/settings';
import type { Goals } from '../types';

interface GoalsContextValue {
  goals: Goals;
  /** False until the first read from storage completes. */
  loaded: boolean;
  /** Re-read goals from storage (call after saving in Settings). */
  refresh: () => Promise<void>;
}

const FALLBACK: Goals = {
  calorieGoal: 2000,
  proteinGoal: 140,
  carbGoal: 220,
  fatGoal: 65,
  waterGoal: 8,
  glassMl: 250,
  weightUnit: 'kg',
  sex: null,
  age: null,
  heightCm: null,
  activity: 1.2,
  goalWeightKg: null,
  caffeineLimit: 400,
  restingBurn: null,
  theme: 'dark',
  language: 'en',
  accent: '#22D3A7',
  mascot: 'dragon',
  waterReminders: false,
  mealReminders: false,
  eveningReminder: false,
  weekdayGoals: null,
  whoopConnected: false,
  whoopLastSync: null,
  onboarded: false,
};

const GoalsContext = createContext<GoalsContextValue>({
  goals: FALLBACK,
  loaded: false,
  refresh: async () => {},
});

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goals>(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    setGoals(await getGoals());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ goals, loaded, refresh }), [goals, loaded, refresh]);
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  return useContext(GoalsContext);
}
