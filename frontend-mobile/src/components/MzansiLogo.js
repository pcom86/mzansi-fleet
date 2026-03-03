import React from 'react';
import Svg, { Rect, Path, Circle, Line, Text as SvgText } from 'react-native-svg';

// Colors from web app
const GOLD = '#D4AF37';
const LIGHT_GOLD = '#F0E68C';
const BLACK = '#000000';

export default function MzansiLogo({ width = 200, height = 80 }) {
  // scale factor if we need to adjust size
  const scale = width / 200;
  return (
    <Svg width={width} height={height} viewBox="0 0 200 80">
      {/* Truck body - Gold */}
      <Rect x={30} y={35} width={35} height={20} rx={2} fill={GOLD} />
      {/* Truck cabin - Black */}
      <Path d="M 25 40 L 30 35 L 30 55 L 25 55 Z" fill={BLACK} />
      {/* Windshield - Light gold */}
      <Rect x={26} y={42} width={3} height={8} fill={LIGHT_GOLD} />
      {/* Wheels - Black with gold centers */}
      <Circle cx={35} cy={55} r={5} fill={BLACK} />
      <Circle cx={35} cy={55} r={2.5} fill="#FFD700" />
      <Circle cx={60} cy={55} r={5} fill={BLACK} />
      <Circle cx={60} cy={55} r={2.5} fill="#FFD700" />
      {/* Speed lines - Gold */}
      <Line x1={15} y1={38} x2={22} y2={38} stroke={GOLD} strokeWidth={2} />
      <Line x1={13} y1={45} x2={20} y2={45} stroke={GOLD} strokeWidth={2} />
      <Line x1={15} y1={52} x2={22} y2={52} stroke={GOLD} strokeWidth={2} />
      {/* Text "MZANSI" */}
      <SvgText
        x={75}
        y={35}
        fontFamily="Arial"
        fontSize={22}
        fontWeight="bold"
        fill={BLACK}
      >
        MZANSI
      </SvgText>
      {/* Text "FLEET" */}
      <SvgText
        x={75}
        y={55}
        fontFamily="Arial"
        fontSize={22}
        fontWeight="bold"
        fill={GOLD}
      >
        FLEET
      </SvgText>
    </Svg>
  );
}
