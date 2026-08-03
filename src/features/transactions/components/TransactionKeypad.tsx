import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const KEYS = [
  ['1', '2', '3', '⌫'],
  ['4', '5', '6', '− ÷'],
  ['7', '8', '9', '+ ×'],
  ['再记', '0', '.', '保存'],
] as const;

export function TransactionKeypad({
  disabled = false,
  onKeyPress,
  onBackspace,
  onSave,
  onSaveAndContinue,
}: {
  disabled?: boolean;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSave: () => void;
  onSaveAndContinue: () => void;
}) {
  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isOperatorKey = key === '− ÷' || key === '+ ×';
            const isSubmitKey = key === '保存' || key === '再记';
            const isDisabled = isOperatorKey || (disabled && isSubmitKey);

            return (
              <Pressable
                key={key}
                accessibilityState={{ disabled: isDisabled }}
                disabled={isDisabled}
                onPress={() => key === '⌫' ? onBackspace() : key === '保存' ? onSave() : key === '再记' ? onSaveAndContinue() : onKeyPress(key)}
                style={({ pressed }) => [styles.key, key === '保存' && styles.saveKey, isDisabled && styles.disabledKey, pressed && styles.pressed]}>
                <ThemedText style={[styles.keyText, key === '保存' && styles.saveText]}>{key}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F0F2F4', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 58, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E6EA' },
  saveKey: { backgroundColor: '#1C2128', borderColor: '#1C2128' },
  keyText: { color: '#2D3A45', fontSize: 21, fontWeight: '500' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabledKey: { opacity: 0.45 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
