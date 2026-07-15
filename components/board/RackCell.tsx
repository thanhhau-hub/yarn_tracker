import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { AreaWithCount } from '../../types';
import { styles } from './boardStyles';

interface RackCellProps {
  area: AreaWithCount | null;
  columnWidth: number;
  isMatched: boolean;
  isTargetArea: boolean;
  shouldDim: boolean;
  hasYarn: boolean;
  lots: string[];
  colors: string[];
  descs: string[];
  onPress: () => void;
}

/**
 * Pulse border animation — only mounted when the cell is actually highlighted.
 * This means Animated.Value + animation loop only exist for 1–2 cells at most,
 * instead of every cell in the grid (100+).
 */
const PulseBorder = React.memo(({ children, columnWidth, cardBg, shouldDim }: {
  children: React.ReactNode;
  columnWidth: number;
  cardBg: string;
  shouldDim: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 350, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 350, useNativeDriver: false }),
      ]),
      { iterations: 6 }
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const animBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2e7d32', '#76c442'],
  });
  const animBorderWidth = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 3],
  });

  return (
    <Animated.View
      style={[
        styles.rackCell,
        styles.highlightedCell,
        {
          width: columnWidth,
          height: columnWidth,
          backgroundColor: cardBg,
          borderColor: animBorderColor,
          borderWidth: animBorderWidth,
          opacity: shouldDim ? 0.2 : 1.0,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
});

/**
 * Static cell — no animation overhead.
 * Used for all non-highlighted cells (the vast majority of the grid).
 */
const StaticCell = React.memo(({ children, columnWidth, cardBg, borderColor, shouldDim }: {
  children: React.ReactNode;
  columnWidth: number;
  cardBg: string;
  borderColor: string;
  shouldDim: boolean;
}) => (
  <View
    style={[
      styles.rackCell,
      {
        width: columnWidth,
        height: columnWidth,
        backgroundColor: cardBg,
        borderColor,
        borderWidth: 1,
        opacity: shouldDim ? 0.2 : 1.0,
      },
    ]}
  >
    {children}
  </View>
));

export const RackCell = React.memo(({
  area,
  columnWidth,
  isMatched,
  isTargetArea,
  shouldDim,
  hasYarn,
  lots,
  colors,
  descs,
  onPress,
}: RackCellProps) => {
  if (!area) {
    return <View style={{ width: columnWidth, height: columnWidth, backgroundColor: 'transparent' }} />;
  }

  const isHighlighted = isMatched || isTargetArea;

  const cardBg = isHighlighted ? '#e8f5e9' : '#ffffff';
  const lotColor = isHighlighted ? '#1b5e20' : hasYarn ? '#2e7d32' : '#cbd5e1';
  const locColor = isHighlighted ? '#2e7d32' : '#64748b';
  const borderColor = hasYarn ? '#c8e6c9' : '#e2e8f0';

  const cellContent = (
    <TouchableOpacity
      style={styles.rackCellTouchable}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.cellLine1Container}>
        <Text style={[styles.cellLocation, { color: locColor }]} numberOfLines={1}>
          {area.code}
        </Text>
        {hasYarn && lots.length > 1 && (
          <View style={styles.badgeContainer}>
            <Text style={[styles.badgeText, { color: isHighlighted ? '#1b4d3e' : '#64748b' }]}>
              +{lots.length - 1}
            </Text>
          </View>
        )}
      </View>

      {hasYarn && lots.length > 0 ? (
        <View style={styles.lotsWrapper}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[styles.cellLotGrid, { color: lotColor, fontWeight: '800' }]}
          >
            {lots[0]}
          </Text>
          {(colors[0] || descs[0]) ? (
            <Text
              numberOfLines={1}
              style={[styles.cellMeta, { color: isHighlighted ? '#2e7d32' : '#94a3b8' }]}
            >
              {[colors[0], descs[0]].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.cellLot, { color: lotColor, fontWeight: '400' }]}
        >
          —
        </Text>
      )}
    </TouchableOpacity>
  );

  // Only the highlighted cell gets the expensive Animated.View + animation loop.
  // All other cells (~100+) use a plain View with zero animation overhead.
  if (isHighlighted) {
    return (
      <PulseBorder columnWidth={columnWidth} cardBg={cardBg} shouldDim={shouldDim}>
        {cellContent}
      </PulseBorder>
    );
  }

  return (
    <StaticCell columnWidth={columnWidth} cardBg={cardBg} borderColor={borderColor} shouldDim={shouldDim}>
      {cellContent}
    </StaticCell>
  );
});
