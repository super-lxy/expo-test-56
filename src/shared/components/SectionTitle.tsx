import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {action ? (
        <ThemedText type="small" themeColor="textSecondary">
          {action}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
});
