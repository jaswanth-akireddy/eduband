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
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0.16" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0.01" />
        </LinearGradient>
      </Defs>

      {[0, 50, 100].map((g) => (
        <Line
          key={g}
          x1={pad}
          y1={y(g)}
          x2={width - pad}
          y2={y(g)}
          stroke={colors.line}
          strokeWidth={1}
        />
      ))}

      <Path d={area} fill="url(#trendArea)" />
      <Path
        d={line}
        stroke={colors.primary}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        return (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={isLast ? 5 : 3}
            fill={isLast ? colors.primary : colors.surface}
            stroke={colors.primary}
            strokeWidth={isLast ? 2 : 1.5}
          />
        );
      })}
    </Svg>
  );
}
