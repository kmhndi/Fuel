import type { WidgetTaskHandler } from 'react-native-android-widget';
import { renderAllAndroidWidgets, renderAndroidWidget } from './android/render';
import { ADD_WATER_ACTION, ANDROID_WIDGET_NAMES, type AndroidWidgetName } from './config';
import { defaultSnapshot } from './defaults';
import { readSnapshot, writeSnapshot } from './storage';
import type { WidgetSnapshot } from './types';

const KNOWN_NAMES = new Set<string>(ANDROID_WIDGET_NAMES);

function asWidgetName(name: string): AndroidWidgetName | null {
  return KNOWN_NAMES.has(name) ? (name as AndroidWidgetName) : null;
}

/**
 * Android headless widget handler. Runs in a fresh JS context where the app's
 * SQLite may be uninitialized, so it renders from the persisted snapshot JSON
 * (falling back to a zeroed default) rather than reading the DB.
 *
 * The water "+" tap is optimistic: it bumps glasses and an additive
 * `pendingDelta` in the snapshot and redraws. The authoritative `adjustWater()`
 * runs later when the app foregrounds (see drainPendingWater), with SQLite as
 * the source of truth.
 */
export const widgetTaskHandler: WidgetTaskHandler = async ({
  widgetInfo,
  widgetAction,
  clickAction,
  clickActionData,
  renderWidget,
}) => {
  const name = asWidgetName(widgetInfo.widgetName);
  if (!name) return;

  const snapshot = (await readSnapshot()) ?? defaultSnapshot();

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(renderAndroidWidget(name, snapshot));
      break;

    case 'WIDGET_CLICK':
      if (clickAction === ADD_WATER_ACTION) {
        const amount =
          typeof clickActionData?.amount === 'number' ? clickActionData.amount : 1;
        const updated: WidgetSnapshot = {
          ...snapshot,
          updatedAt: Date.now(),
          water: {
            ...snapshot.water,
            glasses: snapshot.water.glasses + amount,
            pendingDelta: snapshot.water.pendingDelta + amount,
          },
        };
        await writeSnapshot(updated);
        // Redraw the tapped widget instantly, then refresh siblings (the
        // Summary ring) so they reflect the optimistic glass too.
        renderWidget(renderAndroidWidget(name, updated));
        try {
          await renderAllAndroidWidgets(updated);
        } catch {
          // Sibling refresh is best-effort inside the headless context.
        }
      }
      break;

    case 'WIDGET_DELETED':
    default:
      break;
  }
};
