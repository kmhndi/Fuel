import * as React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget } from 'react-native-android-widget';
import { ringSvg } from './rings';

interface RingProps {
  /** Rendered pixel size of the ring (the SVG viewBox is fixed at 100). */
  size: number;
  /** Stroke width in viewBox units (0..100), not pixels. */
  stroke?: number;
  pct: number;
  color: string;
  trackColor: string;
  trackOpacity?: number;
  /** Centered content drawn on top of the ring (the number + unit). */
  children?: React.ReactNode;
}

/** A progress ring (SVG) with content centered on top of it. */
export function Ring({
  size,
  stroke = 11,
  pct,
  color,
  trackColor,
  trackOpacity,
  children,
}: RingProps) {
  const svg = ringSvg({ pct, color, trackColor, trackOpacity, stroke, size: 100 });
  return (
    <OverlapWidget style={{ width: size, height: size }}>
      <SvgWidget svg={svg} style={{ width: size, height: size }} />
      <FlexWidget
        style={{
          width: size,
          height: size,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </FlexWidget>
    </OverlapWidget>
  );
}
