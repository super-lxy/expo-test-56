import { StyleSheet, View } from 'react-native';

/** Shared pastel atmosphere for the primary app surfaces. */
export function AppBackground() {
  return <View pointerEvents="none" style={styles.background} />;
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8F4F6',
    experimental_backgroundImage: 'linear-gradient(150deg, #F5DDE6 0%, #FBF9F9 43%, #DDF4F6 100%)',
  },
});
