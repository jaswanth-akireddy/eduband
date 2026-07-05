import React from 'react';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { scoreBand, scoreColor, useColors } from '@/theme';

interface Props {
  score: number; // 0-100
  size?: number; // rendered width
}

// Credit-score style gauge for the Communication Index: a 270° arc (open at the
// bottom) coloured by band, with the score, "out of 100", a band pill, and
// 0/100 end ticks. Drawn entirely in SVG so labels always align with the arc.
// Coordinates live in a fixed 300-wide space and scale via the `size` prop.
const CX = 150;
const CY = 160;
const R = 96;
const STROKE = 16;
const START = -135; // degrees, 0 = top, clockwise
const SWEEP = 270;

function polar(deg: number, r: number = R): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function arc(fromDeg: number, toDeg: number): string {
  const [sx, sy] = polar(fromDeg);
  const [ex, ey] = polar(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

export default function ScoreGauge({ score, size = 240 }: Props) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);
  const band = scoreBand(clamped);
  const [t0x] = polar(START, R + 4);
  const [t1x] = polar(START + SWEEP, R + 4);
  const tickY = CY + R * Math.sin((45 * Math.PI) / 180) + 20;

  return (
    <Svg width={size} height={size * 0.72} viewBox="0 44 300 216">
      {/* Track */}
      <Path
        d={arc(START, START + SWEEP)}
        stroke={colors.cardMuted}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
      {/* Value */}
      <Path
        d={arc(START, START + (SWEEP * clamped) / 100)}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
      {/* Score */}
      <SvgText
        x={CX}
        y={CY + 2}
        fontSize={62}
        fontWeight="800"
        fill={colors.text}
        textAnchor="middle"
      >
        {clamped}
      </SvgText>
      <SvgText
        x={CX}
        y={CY + 30}
        fontSize={13}
        fontWeight="600"
        fill={colors.textMuted}
        textAnchor="middle"
      >
        out of 100
      </SvgText>
      {/* Band pill */}
      <Rect x={CX - 46} y={CY + 44} width={92} height={28} rx={14} fill={color + '22'} />
      <SvgText
        x={CX}
        y={CY + 63}
        fontSize={13}
        fontWeight="800"
        fill={color}
        textAnchor="middle"
      >
        {band}
      </SvgText>
      {/* End ticks */}
      <SvgText x={t0x} y={tickY} fontSize={12} fontWeight="700" fill={colors.textFaint} textAnchor="middle">
        0
      </SvgText>
      <SvgText x={t1x} y={tickY} fontSize={12} fontWeight="700" fill={colors.textFaint} textAnchor="middle">
        100
      </SvgText>
    </Svg>
  );
}
