import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { ADD_WATER_ACTION } from '../config';
import type { WidgetSnapshot } from '../types';
import { Ring } from './Ring';
import { WidgetShell } from './WidgetShell';
import { palette } from './theme';

export function WaterWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const pal = palette(snapshot);
  const { water } = snapshot;
  const pct = water.goal > 0 ? water.glasses / water.goal : 0;

  return (
    <WidgetShell pal={pal}>
      <TextWidget
        text="WATER"
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
        <Ring
          size={92}
          stroke={11}
          pct={pct}
          color={pal.water}
          trackColor={pal.track}
          trackOpacity={pal.trackOpacity}
        >
          <TextWidget
            text={`${water.glasses}`}
            maxLines={1}
            style={{ color: pal.textPrimary, fontSize: 26, fontWeight: '700' }}
          />
          <TextWidget text={`of ${water.goal}`} style={{ color: pal.textSecondary, fontSize: 11 }} />
        </Ring>
        <FlexWidget
          clickAction={ADD_WATER_ACTION}
          clickActionData={{ amount: 1 }}
          accessibilityLabel="Add a glass of water"
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: pal.plusBg,
            borderWidth: 1,
            borderColor: pal.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text="+" style={{ color: pal.accent, fontSize: 32, fontWeight: '700' }} />
        </FlexWidget>
      </FlexWidget>
    </WidgetShell>
  );
}
