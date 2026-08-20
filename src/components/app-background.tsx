import { StyleSheet, View } from 'react-native';

/** Vibrant gradient atmosphere for modern fintech aesthetic. */
export function AppBackground() {
  return <View pointerEvents="none" style={styles.background} />;
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    experimental_backgroundImage: 'linear-gradient(135deg, #F7F0FF 0%, #FFFFFF 35%, #EFF6FF 70%, #F0FDF4 100%)',
  },
});
