import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'mic'
  | 'waveform'
  | 'chart'
  | 'trendUp'
  | 'trendDown'
  | 'book'
  | 'target'
  | 'shield'
  | 'lock'
  | 'person'
  | 'gear'
  | 'chevronRight'
  | 'chevronLeft'
  | 'share'
  | 'doc'
  | 'check'
  | 'sparkle'
  | 'key'
  | 'logout'
  | 'swap'
  | 'clock'
  | 'trash';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// In-house icon set: 24pt grid, thin rounded stroke — the SF Symbols register.
// One visual voice for every glyph in the app (no emoji, no mixed icon packs).
export default function Icon({ name, size = 22, color = '#1B1B1F', strokeWidth = 1.8 }: Props) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'mic' && (
        <>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" {...p} />
          <Path d="M12 18v3" {...p} />
        </>
      )}
      {name === 'waveform' && (
        <>
          <Path d="M4 10v4" {...p} />
          <Path d="M8 7v10" {...p} />
          <Path d="M12 4v16" {...p} />
          <Path d="M16 7v10" {...p} />
          <Path d="M20 10v4" {...p} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Path d="M4 20V10" {...p} />
          <Path d="M10 20V4" {...p} />
          <Path d="M16 20v-7" {...p} />
          <Path d="M22 20H2" {...p} />
        </>
      )}
      {name === 'trendUp' && (
        <>
          <Path d="M3 17l6-6 4 4 8-8" {...p} />
          <Path d="M15 7h6v6" {...p} />
        </>
      )}
      {name === 'trendDown' && (
        <>
          <Path d="M3 7l6 6 4-4 8 8" {...p} />
          <Path d="M15 17h6v-6" {...p} />
        </>
      )}
      {name === 'book' && (
        <>
          <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" {...p} />
          <Path d="M4 19a2 2 0 0 1 2-2h13" {...p} />
        </>
      )}
      {name === 'target' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Circle cx={12} cy={12} r={4.5} {...p} />
          <Circle cx={12} cy={12} r={1} fill={color} stroke="none" />
        </>
      )}
      {name === 'shield' && (
        <>
          <Path d="M12 3l7 2.8v5.4c0 4.4-2.9 8.2-7 9.8-4.1-1.6-7-5.4-7-9.8V5.8z" {...p} />
          <Path d="M9.2 12l2 2 3.6-3.8" {...p} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x={5.5} y={10.5} width={13} height={9} rx={2.5} {...p} />
          <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...p} />
        </>
      )}
      {name === 'person' && (
        <>
          <Circle cx={12} cy={8} r={3.6} {...p} />
          <Path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" {...p} />
        </>
      )}
      {name === 'gear' && (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path
            d="M12 2.8l1 2.2a7.3 7.3 0 0 1 2.2.9l2.3-.8 1.4 2.4-1.6 1.8c.1.4.1.9.1 1.4l1.6 1.8-1.4 2.4-2.3-.8a7.3 7.3 0 0 1-2.2.9l-1 2.2h-2.8l-1-2.2a7.3 7.3 0 0 1-2.2-.9l-2.3.8-1.4-2.4 1.6-1.8a7 7 0 0 1 0-1.4L3.7 7.5l1.4-2.4 2.3.8a7.3 7.3 0 0 1 2.2-.9l1-2.2z"
            {...p}
          />
        </>
      )}
      {name === 'chevronRight' && <Path d="M9.5 6l6 6-6 6" {...p} />}
      {name === 'chevronLeft' && <Path d="M14.5 6l-6 6 6 6" {...p} />}
      {name === 'share' && (
        <>
          <Path d="M12 14V4" {...p} />
          <Path d="M8.5 7.5L12 4l3.5 3.5" {...p} />
          <Path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...p} />
        </>
      )}
      {name === 'doc' && (
        <>
          <Path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" {...p} />
          <Path d="M14 3v4h4" {...p} />
          <Path d="M9 13h6M9 16.5h4" {...p} />
        </>
      )}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'sparkle' && (
        <>
          <Path d="M12 4l1.8 4.6L18.5 10l-4.7 1.4L12 16l-1.8-4.6L5.5 10l4.7-1.4z" {...p} />
          <Path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" {...p} />
        </>
      )}
      {name === 'key' && (
        <>
          <Circle cx={8} cy={14} r={4} {...p} />
          <Path d="M11 11l8-8" {...p} />
          <Path d="M16 6l2.5 2.5M13.5 8.5L16 11" {...p} />
        </>
      )}
      {name === 'logout' && (
        <>
          <Path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" {...p} />
          <Path d="M17 8l4 4-4 4" {...p} />
          <Path d="M21 12H10" {...p} />
        </>
      )}
      {name === 'swap' && (
        <>
          <Path d="M7 4v13" {...p} />
          <Path d="M3.5 7.5L7 4l3.5 3.5" {...p} />
          <Path d="M17 20V7" {...p} />
          <Path d="M13.5 16.5L17 20l3.5-3.5" {...p} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M12 7.5V12l3 2" {...p} />
        </>
      )}
      {name === 'trash' && (
        <>
          <Path d="M5 7h14" {...p} />
          <Path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" {...p} />
          <Path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" {...p} />
          <Path d="M10 11v6M14 11v6" {...p} />
        </>
      )}
    </Svg>
  );
}
