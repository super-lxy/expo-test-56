import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCurrency } from '@/shared/utils/currency';

export function NetWorthChart({
  values,
  lineColor = '#E76F51',
  areaColor = '#FFF4EF',
}: {
  values: number[];
  lineColor?: string;
  areaColor?: string;
}) {
  const [width, setWidth] = useState(0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const chartHeight = 132;
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 0 : (index / (values.length - 1)) * Math.max(width - 12, 1),
    y: chartHeight - ((value - min) / range) * chartHeight,
  }));

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.chartArea}>
        {[0, 1, 2, 3].map((line) => (
          <View key={line} style={[styles.gridLine, { top: line * (chartHeight / 3) }]} />
        ))}
        <View style={styles.yLabels}>
          <ThemedText type="small" themeColor="textSecondary">{formatCurrency(max)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{formatCurrency((max + min) / 2)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{formatCurrency(min)}</ThemedText>
        </View>
        <View style={[styles.plotArea, { backgroundColor: areaColor }]}>
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
      <View style={styles.xLabels}>
        <ThemedText type="small" themeColor="textSecondary">较早</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">最近</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  chartArea: { height: 154, position: 'relative', paddingLeft: 48, paddingRight: 4 },
  gridLine: { position: 'absolute', left: 48, right: 4, height: 1, backgroundColor: '#ECEDEF' },
  yLabels: { position: 'absolute', left: 0, top: 0, height: 132, justifyContent: 'space-between' },
  plotArea: { height: 132, position: 'relative', overflow: 'hidden', backgroundColor: '#FFF4EF' },
  segment: { position: 'absolute', height: 2, backgroundColor: '#E76F51', transformOrigin: 'left center' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 48 },
});
