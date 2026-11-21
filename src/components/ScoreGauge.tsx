import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { scoreBand, scoreColor, scoreTextColor, useColors } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  score: number; // 0-100
  size?: number; // rendered width
}

// Credit-score style gauge for the Communication Index: a 270° arc (open at the
// bottom) coloured by band, with the score, "out of 100" and a band pill.
// No 0/100 end ticks: they only repeated "out of 100". Drawn entirely in SVG
// so labels always align with the arc.
// Coordinates live in a fixed 300-wide space and scale via the `size` prop.
const CX = 150;
const CY = 160;
const R = 96;
const STROKE = 13;
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
  const color = scoreColor(clamped, colors); // the arc (3:1 applies)
  const textColor = scoreTextColor(clamped, colors); // the band word (4.5:1)
  const band = scoreBand(clamped);

  // Entrance: the arc sweeps and the score counts up together.
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (reduceMotion) {
      setProgress(clamped);
      return;
    }
    const id = anim.addListener(({ value: v }) => setProgress(v));
    Animated.timing(anim, {
      toValue: clamped,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // drives SVG props via state
    }).start();
    return () => anim.removeListener(id);
  }, [clamped, anim, reduceMotion]);

  return (
    <Svg width={size} height={size * 0.64} viewBox="0 44 300 192">
      {/* Track */}
      <Path
        d={arc(START, START + SWEEP)}
        stroke={colors.cardMuted}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
      {/* Value */}
      {progress > 0.5 && (
        <Path
          d={arc(START, START + (SWEEP * progress) / 100)}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {/* Score */}
      <SvgText
        x={CX}
        y={CY + 2}
        fontSize={60}
        fontFamily="Poppins_700Bold"
        letterSpacing={-1}
        fill={colors.text}
        textAnchor="middle"
      >
        {Math.round(progress)}
      </SvgText>
      <SvgText
        x={CX}
        y={CY + 30}
        fontSize={13}
        fontFamily="Poppins_500Medium"
        fill={colors.textMuted}
        textAnchor="middle"
      >
        out of 100
      </SvgText>
      {/* Band pill */}
      <Rect x={CX - 40} y={CY + 44} width={80} height={26} rx={13} fill={color + '16'} />
      <SvgText
        x={CX}
        y={CY + 61}
        fontSize={13}
        fontFamily="Poppins_600SemiBold"
        fill={textColor}
        textAnchor="middle"
      >
        {band}
      </SvgText>
    </Svg>
  );
}
