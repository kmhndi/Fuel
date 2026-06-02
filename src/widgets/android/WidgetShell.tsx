import * as React from 'react';
import { FlexWidget } from 'react-native-android-widget';
import type { WidgetPalette } from './theme';

interface ShellProps {
  pal: WidgetPalette;
  children?: React.ReactNode;
}

/**
 * The frosted-glass card every widget sits in: indigo gradient, rounded
 * corners, hairline border. Tapping anywhere not handled by a child opens the
 * app.
 */
export function WidgetShell({ pal, children }: ShellProps) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        padding: 14,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: pal.border,
        backgroundGradient: {
          from: pal.gradientFrom,
          to: pal.gradientTo,
          orientation: 'TL_BR',
        },
      }}
    >
      {children}
    </FlexWidget>
  );
}
