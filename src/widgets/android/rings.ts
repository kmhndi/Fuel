interface RingOptions {
  /** Progress 0..1 (values outside are clamped). */
  pct: number;
  /** Solid hex color of the progress arc. */
  color: string;
  /** Solid hex color of the background track. */
  trackColor: string;
  /** Track opacity 0..1 (the arc itself is always opaque). */
  trackOpacity?: number;
  /** Stroke width in viewBox units. */
  stroke?: number;
  /** viewBox size in units (the SvgWidget scales this to its pixel box). */
  size?: number;
}

/**
 * Build an SVG string for a circular progress ring, starting at 12 o'clock and
 * filling clockwise. Rendered by `SvgWidget` (AndroidSVG under the hood), so it
 * sticks to plain presentation attributes — solid colors, `stroke-dasharray`,
 * and a rotate transform — which AndroidSVG renders reliably.
 */
export function ringSvg({
  pct,
  color,
  trackColor,
  trackOpacity = 0.16,
  stroke = 12,
  size = 100,
}: RingOptions): string {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  const dash = +(p * circ).toFixed(2);
  const gap = +(circ - dash).toFixed(2);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${trackColor}" stroke-opacity="${trackOpacity}" stroke-width="${stroke}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash} ${gap}" transform="rotate(-90 ${c} ${c})"/></svg>`;
}
