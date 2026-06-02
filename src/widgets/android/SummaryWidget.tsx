import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../types';
import { Ring } from './Ring';
import { WidgetShell } from './WidgetShell';
import { palette, type WidgetPalette } from './theme';

interface MetricProps {
  pal: WidgetPalette;
  label: string;
  value: string;
  pct: number;
  color: string;
}

function Metric({ pal, label, value, pct, color }: MetricProps) {
  return (
    <FlexWidget
      style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <Ring
        size={74}
        stroke={12}
        pct={pct}
        color={color}
        trackColor={pal.track}
        trackOpacity={pal.trackOpacity}
      >
        <TextWidget
          text={value}
          maxLines={1}
          style={{ color: pal.textPrimary, fontSize: 15, fontWeight: '700' }}
        />
      </Ring>
      <TextWidget
        text={label}
        style={{ color: pal.textSecondary, fontSize: 11, marginTop: 6 }}
      />
    </FlexWidget>
  );
}

/** Medium (4x2) widget: all three rings side by side — the Fitness-style view. */
export function SummaryWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const pal = palette(snapshot);
  const { calories, protein, water } = snapshot;
  const waterPct = water.goal > 0 ? water.glasses / water.goal : 0;

  return (
    <WidgetShell pal={pal}>
      <TextWidget
        text="TODAY"
        style={{ color: pal.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}
      />
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Metric
          pal={pal}
          label="kcal"
          value={calories.over ? `+${Math.abs(calories.left)}` : `${calories.left}`}
          pct={calories.pct}
          color={calories.over ? pal.over : pal.accent}
        />
        <Metric
          pal={pal}
          label="protein"
          value={`${Math.max(0, protein.left)}g`}
          pct={protein.pct}
          color={pal.protein}
        />
        <Metric
          pal={pal}
          label="water"
          value={`${water.glasses}/${water.goal}`}
          pct={waterPct}
          color={pal.water}
        />
      </FlexWidget>
    </WidgetShell>
  );
}
