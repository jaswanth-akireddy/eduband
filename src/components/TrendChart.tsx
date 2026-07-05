import React from 'react';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
} from 'react-native-svg';
import { font, useColors } from '@/theme';

interface Props {
  values: number[]; // chronological CI scores (oldest -> newest)
  width?: number;
  height?: number;
}

// CI trend over time with a smooth gradient area fill.
export default function TrendChart({ values, width = 320, height = 150 }: Props) {
  const colors = useColors();
  if (values.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: font.small }}>
          Record a few sessions to see your growth here.
        </Text>
      </View>
    );
  }

  const pad = 18;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const stepX = w / (values.length - 1);
  const x = (i: number) => pad + i * stepX;
  const y = (v: number) => pad + h - (v / 100) * h;

  const line = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`)
    .join(' ');
  const area = `${line} L ${x(values.length - 1)} ${pad + h} L ${x(0)} ${pad + h} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0.35" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
        </LinearGradient>
        <LinearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.accent} />
          <Stop offset="1" stopColor={colors.violet} />
        </LinearGradient>
      </Defs>

      {[0, 50, 100].map((g) => (
        <Line
          key={g}
          x1={pad}
          y1={y(g)}
          x2={width - pad}
          y2={y(g)}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="3 5"
        />
      ))}

      <Path d={area} fill="url(#trendArea)" />
      <Path
        d={line}
        stroke="url(#trendLine)"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <Circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={4.5}
          fill={colors.white}
          stroke={colors.violet}
          strokeWidth={2.5}
        />
      ))}
    </Svg>
  );
}
