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
  seed?: string; // usually the user's name — varies skin/hair/shirt/background
  size?: number;
}

// Deterministic, on-device cartoon avatar. No network, no third-party SDK, no
// data leaves the device (important for a minors' app). The same name+gender
// always yields the same friendly face — a head-and-shoulders "persona" with
// hairstyle by gender and colours seeded from the name.
const SKIN = ['#F7D2B8', '#F0BE9B', '#E0A579', '#C6875B', '#9C6B45', '#6E4A32'];
const HAIR = ['#241912', '#3B2A1B', '#5C3B23', '#8A5A2B', '#111111', '#C69B63', '#7A7A7A'];
const SHIRT = ['#5B8DEF', '#22B8A6', '#F0714F', '#8E68E8', '#E0568A', '#3FB16D', '#F0A93B'];
const BG = ['#FFE3E8', '#E4EEFF', '#E7F7EC', '#FFF2DA', '#F0E6FF', '#DCF5F1', '#FDE6F1'];
const EYE = '#33291F';

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = <T,>(arr: T[], n: number): T => arr[n % arr.length];

// Gender-specific hairstyles (crown-covering, so nobody looks bald).
const TOP_HAIR: Record<Gender, string> = {
  female: 'M21 47 C19 9 81 9 79 47 C77 34 68 31 59 32 C56 29 44 29 41 32 C32 31 23 34 21 47 Z',
  male: 'M23 45 C21 7 79 7 77 45 C76 33 67 31 58 32 C55 29 45 29 42 32 C33 31 24 33 23 45 Z',
  other: 'M24 46 C22 10 78 10 76 46 C75 35 66 32 58 33 C55 31 45 31 42 33 C34 32 25 35 24 46 Z',
};
const FEMALE_BACK =
  'M18 50 C16 12 84 12 82 50 L82 72 C82 82 70 82 69 72 C71 55 66 48 59 45 L41 45 C34 48 29 55 31 72 C30 82 18 82 18 72 Z';

export default function Avatar({ gender = 'other', seed = 'EduBand', size = 64 }: Props) {
  const { skin, hair, shirt, bg, clipId } = useMemo(() => {
    const h = hashOf(seed || 'EduBand');
    return {
      skin: pick(SKIN, h),
      hair: pick(HAIR, Math.floor(h / 7)),
      shirt: pick(SHIRT, Math.floor(h / 11)),
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

        {/* Shoulders / shirt */}
        <Path d="M10 100 C10 79 29 71 50 71 C71 71 90 79 90 100 Z" fill={shirt} />

        {/* Neck + soft shadow */}
        <Path d="M44 55 h12 v11 c0 5 -12 5 -12 0 Z" fill={skin} />
        <Path d="M44 60 c3 3 9 3 12 0 v4 c0 4 -12 4 -12 0 Z" fill="#000000" opacity={0.06} />

        {/* Long hair behind the head (female) */}
        {gender === 'female' && <Path d={FEMALE_BACK} fill={hair} />}

        {/* Ears + head */}
        <Circle cx={30} cy={43} r={3} fill={skin} />
        <Circle cx={70} cy={43} r={3} fill={skin} />
        <Circle cx={50} cy={41} r={22} fill={skin} />

        {/* Hair on top */}
        <Path d={TOP_HAIR[gender]} fill={hair} />

        {/* Eyes + catchlights */}
        <Circle cx={42} cy={40.5} r={2.7} fill={EYE} />
        <Circle cx={58} cy={40.5} r={2.7} fill={EYE} />
        <Circle cx={43} cy={39.7} r={0.9} fill="#FFFFFF" opacity={0.85} />
        <Circle cx={59} cy={39.7} r={0.9} fill="#FFFFFF" opacity={0.85} />

        {/* Brows */}
        <Path d="M38.7 36 q3.6 -2 7.1 0" stroke={hair} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <Path d="M54.2 36 q3.6 -2 7.1 0" stroke={hair} strokeWidth={1.6} fill="none" strokeLinecap="round" />

        {/* Blush */}
        <Ellipse cx={37.5} cy={47} rx={3} ry={1.7} fill="#FF9DB0" opacity={0.5} />
        <Ellipse cx={62.5} cy={47} rx={3} ry={1.7} fill="#FF9DB0" opacity={0.5} />

        {/* Smile */}
        <Path
          d="M43.5 47.5 Q50 53.5 56.5 47.5"
          stroke="#9A4A54"
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
