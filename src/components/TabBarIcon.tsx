import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

// Lightweight inline icons (no extra icon font dependency).
export default function TabBarIcon({
  route,
  color,
  size,
}: {
  route: string;
  color: string;
  size: number;
}) {
  const sw = 2;
  switch (route) {
    case 'Home':
    case 'TeacherHome':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'Practice':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} strokeWidth={sw} />
          <Path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M12 18v3" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'Progress':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="3 17 9 11 13 15 21 7"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="15 7 21 7 21 13"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'Lab':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M9 3h6" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'TeacherSessions':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={4} y={4} width={16} height={16} rx={2} stroke={color} strokeWidth={sw} />
          <Path d="M8 9h8M8 13h5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'TeacherProfile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={sw} />
          <Path d="M4 21a8 8 0 0 1 16 0" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'Privacy':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Polyline
            points="9 12 11 14 15 10"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} fill="none" />
        </Svg>
      );
  }
}
