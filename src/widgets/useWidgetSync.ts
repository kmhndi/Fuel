import { useEffect } from 'react';
import { AppState } from 'react-native';
import { drainPendingWater } from './reconcile';

/** Drain widget-originated water taps whenever the app returns to foreground. */
export function useWidgetSync(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drainPendingWater();
    });
    return () => sub.remove();
  }, []);
}
