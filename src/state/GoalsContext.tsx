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
  /** Re-read goals from storage (call after saving in Settings). */
  refresh: () => Promise<void>;
}

const FALLBACK: Goals = {
  calorieGoal: 2000,
  proteinGoal: 140,
  carbGoal: 220,
  fatGoal: 65,
  onboarded: false,
};

const GoalsContext = createContext<GoalsContextValue>({
  goals: FALLBACK,
  refresh: async () => {},
});

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goals>(FALLBACK);

  const refresh = useCallback(async () => {
    setGoals(await getGoals());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ goals, refresh }), [goals, refresh]);
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  return useContext(GoalsContext);
}
