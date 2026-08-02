import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const KEYS = [
  ['1', '2', '3', '⌫'],
  ['4', '5', '6', '− ÷'],
  ['7', '8', '9', '+ ×'],
  ['再记', '0', '.', '保存'],
] as const;

export function TransactionKeypad({
  onKeyPress,
  onBackspace,
  onSave,
  onSaveAndContinue,
}: {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSave: () => void;
  onSaveAndContinue: () => void;
}) {
  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              onPress={() => key === '⌫' ? onBackspace() : key === '保存' ? onSave() : key === '再记' ? onSaveAndContinue() : onKeyPress(key)}
              style={({ pressed }) => [styles.key, key === '保存' && styles.saveKey, pressed && styles.pressed]}>
              <ThemedText style={[styles.keyText, key === '保存' && styles.saveText]}>{key}</ThemedText>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#E8E8ED', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#9B9BA5', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  saveKey: { backgroundColor: '#2D7185' },
  keyText: { color: '#45464D', fontSize: 24, fontWeight: '600' },
  saveText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
