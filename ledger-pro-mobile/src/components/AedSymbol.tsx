import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import { ViewStyle, StyleProp } from 'react-native';

interface Props {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const AedSymbol = ({ size = 24, color = 'currentColor', style }: Props) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* The Letter D */}
      <Path
        d="M 5 3 L 5 21 L 11 21 C 17 21, 21 17, 21 12 C 21 7, 17 3, 11 3 Z M 8 5.5 L 8 18.5 L 11 18.5 C 15 18.5, 18 16, 18 12 C 18 8, 15 5.5, 11 5.5 Z"
        fill={color}
        fillRule="evenodd"
      />
      {/* Top Horizontal Line */}
      <Line x1="1" y1="10.5" x2="23" y2="10.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Bottom Horizontal Line */}
      <Line x1="1" y1="14.5" x2="23" y2="14.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
};
