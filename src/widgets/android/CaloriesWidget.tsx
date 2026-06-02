import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../types';
import { Ring } from './Ring';
import { WidgetShell } from './WidgetShell';
import { palette } from './theme';

export function CaloriesWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const pal = palette(snapshot);
  const { calories } = snapshot;
  const over = calories.over;
  const big = over ? `+${Math.abs(calories.left)}` : `${calories.left}`;

  return (
    <WidgetShell pal={pal}>
      <TextWidget
        text="CALORIES"
        style={{ color: pal.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}
      />
      <FlexWidget
        style={{ flex: 1, width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ring
          size={104}
          stroke={11}
          pct={calories.pct}
          color={over ? pal.over : pal.accent}
          trackColor={pal.track}
          trackOpacity={pal.trackOpacity}
        >
          <TextWidget
            text={big}
            maxLines={1}
            style={{ color: pal.textPrimary, fontSize: 27, fontWeight: '700' }}
          />
          <TextWidget
            text={over ? 'kcal over' : 'kcal left'}
            style={{ color: pal.textSecondary, fontSize: 11 }}
          />
        </Ring>
      </FlexWidget>
    </WidgetShell>
  );
}
