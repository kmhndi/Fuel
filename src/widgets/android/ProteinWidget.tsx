import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../types';
import { Ring } from './Ring';
import { WidgetShell } from './WidgetShell';
import { palette } from './theme';

export function ProteinWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const pal = palette(snapshot);
  const { protein } = snapshot;
  const done = protein.left <= 0;

  return (
    <WidgetShell pal={pal}>
      <TextWidget
        text="PROTEIN"
        style={{ color: pal.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}
      />
      <FlexWidget
        style={{ flex: 1, width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ring
          size={104}
          stroke={11}
          pct={protein.pct}
          color={pal.protein}
          trackColor={pal.track}
          trackOpacity={pal.trackOpacity}
        >
          <TextWidget
            text={done ? 'done' : `${protein.left}`}
            maxLines={1}
            style={{ color: pal.textPrimary, fontSize: done ? 22 : 27, fontWeight: '700' }}
          />
          <TextWidget
            text={done ? 'goal hit' : 'g left'}
            style={{ color: pal.textSecondary, fontSize: 11 }}
          />
        </Ring>
      </FlexWidget>
    </WidgetShell>
  );
}
