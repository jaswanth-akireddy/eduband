import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { PillarScore } from '@/types';
import { pillarColor, useColors } from '@/theme';

interface Props {
  pillars: PillarScore[];
  size?: number;
}

// Five-pillar radar with a gradient fill and colour-coded vertices.
export default function PillarRadar({ pillars, size = 280 }: Props) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const n = pillars.length;
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (i: number, value: number) => {
    const a = angleFor(i);
    const rad = (value / 100) * r;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  };

  const polygon = pillars
    .map((p, i) => {
      const pt = point(i, p.score);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  const gridLevels = [25, 50, 75, 100];

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.45" />
            <Stop offset="1" stopColor={colors.violet} stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.violet} />
          </LinearGradient>
        </Defs>

        {gridLevels.map((lvl) => (
          <Polygon
            key={lvl}
            points={pillars
              .map((_, i) => {
                const pt = point(i, lvl);
                return `${pt.x},${pt.y}`;
              })
              .join(' ')}
            stroke={colors.border}
            strokeWidth={1}
            fill="none"
          />
        ))}

        {pillars.map((_, i) => {
          const pt = point(i, 100);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={pt.x}
              y2={pt.y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}

        <Polygon
          points={polygon}
          fill="url(#radarFill)"
          stroke="url(#radarStroke)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {pillars.map((p, i) => {
          const pt = point(i, p.score);
          return (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill={pillarColor(p.id)}
              stroke={colors.white}
              strokeWidth={2}
            />
          );
        })}

        {pillars.map((p, i) => {
          const pt = point(i, 122);
          const a = angleFor(i);
          const anchor =
            Math.abs(Math.cos(a)) < 0.3
              ? 'middle'
              : Math.cos(a) > 0
              ? 'start'
              : 'end';
          return (
            <SvgText
              key={i}
              x={pt.x}
              y={pt.y}
              fontSize={11}
              fontWeight="700"
              fill={pillarColor(p.id)}
              textAnchor={anchor as any}
            >
              {p.label.split(' ')[0]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
