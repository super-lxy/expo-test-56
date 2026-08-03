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
  container: { backgroundColor: '#DDEFE2', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 58, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F4EA', borderWidth: 1, borderColor: '#C9E0CE' },
  saveKey: { backgroundColor: '#477D6C', borderColor: '#477D6C' },
  keyText: { color: '#3B5246', fontSize: 21, fontWeight: '500' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
