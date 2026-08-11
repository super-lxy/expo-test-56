import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Numeric, Type } from '@/constants/theme';

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
  secondaryActionLabel = '再记',
}: {
  disabled?: boolean;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSave: () => void;
  onSaveAndContinue: () => void;
  secondaryActionLabel?: string;
}) {
  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isOperatorKey = key === '− ÷' || key === '+ ×';
            const isSubmitKey = key === '保存' || key === '再记';
            const isDisabled = isOperatorKey || (disabled && isSubmitKey);
            const label = key === '再记' ? secondaryActionLabel : key;

            return (
              <Pressable
                key={key}
                accessibilityState={{ disabled: isDisabled }}
                disabled={isDisabled}
                onPress={() => key === '⌫' ? onBackspace() : key === '保存' ? onSave() : key === '再记' ? onSaveAndContinue() : onKeyPress(key)}
                style={({ pressed }) => [styles.key, key === '保存' && styles.saveKey, isDisabled && styles.disabledKey, pressed && styles.pressed]}>
                <ThemedText style={[styles.keyText, isSubmitKey && styles.submitText, key === '保存' && styles.saveText]}>{label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#EFF0F2', paddingHorizontal: 9, paddingVertical: 7, gap: 4 },
  row: { flexDirection: 'row', gap: 4 },
  key: { flex: 1, height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  saveKey: { backgroundColor: '#1C2128' },
  keyText: { ...Type.title, ...Numeric, color: '#2D3A45', fontWeight: FontWeight.regular },
  /**
   * 「保存」「再记」是中文双字键：跟随文本阶梯而非数字键的字号，
   * 并把 keyText 继承来的 Numeric 字体族清掉 —— 中文要走系统默认字体。
   */
  submitText: { ...Type.headline, fontFamily: undefined, fontWeight: FontWeight.semibold },
  saveText: { color: '#FFFFFF' },
  disabledKey: { opacity: 0.45 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
