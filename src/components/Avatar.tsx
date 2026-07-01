import React, { useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
} from 'react-native-svg';
import { Gender } from '@/types';

interface Props {
  gender?: Gender;
  seed?: string; // usually the user's name — varies skin/hair/background
  size?: number;
}

// Deterministic, on-device cartoon avatar. No network, no third-party SDK, no
// data leaves the device (important for a minors' app). The same name+gender
// always yields the same friendly face, so it feels personal and stable.
const SKIN = ['#F8D5C2', '#F1C5A4', '#E3AC80', '#C68C5E', '#9A6A43', '#73492C'];
const HAIR = ['#2B1B14', '#3D2817', '#5A3A22', '#8A5A2B', '#1A1A1A', '#B07B45', '#6E6E6E'];
const BG = ['#FFE0E6', '#E2EEFF', '#E6F7EA', '#FFF1D6', '#EFE3FF', '#D9F5F1', '#FCE3F1'];
const MOUTH = '#B5485F';

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = <T,>(arr: T[], n: number): T => arr[n % arr.length];

export default function Avatar({ gender = 'other', seed = 'EduBand', size = 64 }: Props) {
  const { skin, hair, bg, clipId } = useMemo(() => {
    const h = hashOf(seed || 'EduBand');
    return {
      skin: pick(SKIN, h),
      hair: pick(HAIR, Math.floor(h / 7)),
      bg: pick(BG, Math.floor(h / 13)),
      clipId: `avatarClip_${h}_${size}`,
    };
  }, [seed, size]);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Circle cx={50} cy={50} r={50} fill={bg} />

        {/* Long hair behind the head (female) */}
        {gender === 'female' && <Ellipse cx={50} cy={58} rx={34} ry={34} fill={hair} />}

        {/* Face */}
        <Circle cx={50} cy={50} r={30} fill={skin} />

        {/* Eyes */}
        <Circle cx={40} cy={48} r={3.1} fill="#23201F" />
        <Circle cx={60} cy={48} r={3.1} fill="#23201F" />

        {/* Blush */}
        <Ellipse cx={34} cy={57} rx={4} ry={2.4} fill="#FF9DB0" opacity={0.55} />
        <Ellipse cx={66} cy={57} rx={4} ry={2.4} fill="#FF9DB0" opacity={0.55} />

        {/* Smile */}
        <Path
          d="M41 60 Q50 69 59 60"
          stroke={MOUTH}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {/* Hair on top — style varies by gender */}
        {gender === 'female' && (
          <Path d="M19 46 C19 16 81 16 81 46 C72 30 28 30 19 46 Z" fill={hair} />
        )}
        {gender === 'male' && (
          <Path d="M24 41 C27 17 73 17 76 41 C68 30 32 30 24 41 Z" fill={hair} />
        )}
        {gender === 'other' && (
          <Path d="M21 45 C23 16 77 16 79 45 C70 31 30 31 21 45 Z" fill={hair} />
        )}
      </G>
    </Svg>
  );
}
