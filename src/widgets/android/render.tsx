import * as React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { ANDROID_WIDGET_NAMES, type AndroidWidgetName } from '../config';
import type { WidgetSnapshot } from '../types';
import { CaloriesWidget } from './CaloriesWidget';
import { ProteinWidget } from './ProteinWidget';
import { SummaryWidget } from './SummaryWidget';
import { WaterWidget } from './WaterWidget';

/** Map a widget name to its rendered element for the given snapshot. */
export function renderAndroidWidget(
  name: AndroidWidgetName,
  snapshot: WidgetSnapshot,
): React.JSX.Element {
  switch (name) {
    case 'Calories':
      return <CaloriesWidget snapshot={snapshot} />;
    case 'Protein':
      return <ProteinWidget snapshot={snapshot} />;
    case 'Water':
      return <WaterWidget snapshot={snapshot} />;
    case 'Summary':
      return <SummaryWidget snapshot={snapshot} />;
  }
}

/**
 * Push the snapshot to every installed Android widget. `requestWidgetUpdate`
 * no-ops per name when none of that type are on the home screen, so this is
 * safe to call unconditionally after any data change.
 */
export async function renderAllAndroidWidgets(snapshot: WidgetSnapshot): Promise<void> {
  await Promise.all(
    ANDROID_WIDGET_NAMES.map((name) =>
      requestWidgetUpdate({
        widgetName: name,
        renderWidget: () => renderAndroidWidget(name, snapshot),
        widgetNotFound: () => {},
      }),
    ),
  );
}
