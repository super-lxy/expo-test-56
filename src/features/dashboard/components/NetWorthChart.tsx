import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Numeric } from '@/constants/theme';
import { formatCurrencyCompact } from '@/shared/utils/currency';

export function NetWorthChart({
  values,
  xLabels,
  lineColor = '#E76F51',
  areaColor = '#FFF4EF',
  height = 132,
}: {
  values: number[];
  xLabels?: string[];
  lineColor?: string;
  areaColor?: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const actualMin = Math.min(...values);
  const actualMax = Math.max(...values, actualMin + 1);
  const padding = (actualMax - actualMin) * 0.15 || actualMax * 0.02 || 100;
  const min = Math.max(0, actualMin - padding);
  const max = actualMax + padding * 0.5;
  const range = max - min || 1;
  const chartHeight = height;

  const points = values.map((value, index) => ({
    x: values.length === 1 ? 0 : (index / (values.length - 1)) * Math.max(width - 12, 1),
    y: chartHeight - ((value - min) / range) * chartHeight,
  }));

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  // 决定 X 轴显示的标签
  const labelPositions = (xLabels ?? [])
    .map((label, i) => ({ label, index: i }))
    .filter(({ label }) => Boolean(label));

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={[styles.chartArea, { height: chartHeight + 4 }]}>
        {[0, 1, 2, 3].map((line) => (
          <View key={line} style={[styles.gridLine, { top: line * (chartHeight / 3) }]} />
        ))}
        <View style={[styles.yLabels, { height: chartHeight }]}>
          <ThemedText type="small" themeColor="textSecondary" style={Numeric}>{formatCurrencyCompact(max)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={Numeric}>{formatCurrencyCompact((max + min) / 2)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={Numeric}>{formatCurrencyCompact(min)}</ThemedText>
        </View>
        <View style={[styles.plotArea, { height: chartHeight, backgroundColor: areaColor }]}>
          {points.slice(0, -1).map((point, index) => {
            const next = points[index + 1];
            const dx = next.x - point.x;
            const dy = next.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`${point.x}-${point.y}`}
                style={[styles.segment, { left: point.x, top: point.y, width: length, backgroundColor: lineColor, transform: [{ rotate: `${angle}deg` }] }]}
              />
            );
          })}
        </View>
      </View>
      {/* X 轴日期标签 */}
      <View style={styles.xLabels}>
        {labelPositions.length >= 2 ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">{labelPositions[0].label}</ThemedText>
            {labelPositions.length === 3 ? (
              <ThemedText type="small" themeColor="textSecondary">{labelPositions[1].label}</ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">{labelPositions[labelPositions.length - 1].label}</ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">较早</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">最近</ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  chartArea: { height: 136, position: 'relative', paddingLeft: 56, paddingRight: 4 },
  gridLine: { position: 'absolute', left: 56, right: 4, height: 1, backgroundColor: '#ECEDEF' },
  yLabels: { position: 'absolute', left: 0, top: 0, width: 52, height: 132, justifyContent: 'space-between' },
  plotArea: { height: 132, position: 'relative', overflow: 'hidden' },
  segment: { position: 'absolute', height: 2, transformOrigin: 'left center' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 56, paddingRight: 4 },
});
