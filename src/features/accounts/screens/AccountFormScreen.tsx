import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { parseAmountToCents } from '@/shared/utils/currency';
import { createAccount } from '../application/createAccount';
import type { AccountType } from '../domain/account.types';
import { useAccountRepository } from '../hooks/useAccountRepository';

const TYPES: Array<{ type: AccountType; label: string }> = [
  { type: 'cash', label: '现金' },
  { type: 'bank', label: '银行卡' },
  { type: 'wallet', label: '电子钱包' },
  { type: 'credit-card', label: '信用卡' },
  { type: 'other', label: '其他' },
];

export function AccountFormScreen() {
  const router = useRouter();
  const repository = useAccountRepository();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('wallet');
  const [initialBalance, setInitialBalance] = useState('');

  async function handleSubmit() {
    try {
      await createAccount(repository, {
        name,
        type,
        initialBalanceCents: parseAmountToCents(initialBalance),
      });
      router.back();
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}><ThemedText themeColor="textSecondary">取消</ThemedText></Pressable>
          <ThemedText style={styles.title}>添加账户</ThemedText>
          <Pressable onPress={() => void handleSubmit()}><ThemedText style={styles.save}>保存</ThemedText></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText style={styles.label}>账户名称</ThemedText>
          <TextInput value={name} onChangeText={setName} placeholder="例如：支付宝、招商银行" style={styles.input} />
          <ThemedText style={styles.label}>账户类型</ThemedText>
          <View style={styles.types}>
            {TYPES.map((item) => (
              <Pressable key={item.type} onPress={() => setType(item.type)} style={[styles.typeButton, type === item.type && styles.typeSelected]}>
                <ThemedText type="small">{item.label}</ThemedText>
              </Pressable>
            ))}
          </View>
          <ThemedText style={styles.label}>初始余额</ThemedText>
          <TextInput value={initialBalance} onChangeText={setInitialBalance} keyboardType="decimal-pad" placeholder="0.00" style={styles.input} />
          <Pressable onPress={() => void handleSubmit()} style={styles.submitButton}>
            <ThemedText style={styles.submitText}>保存账户</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  title: { fontSize: 18, fontWeight: '800' },
  save: { color: '#2563EB', fontWeight: '800' },
  content: { padding: Spacing.three, gap: Spacing.two },
  label: { fontWeight: '800', marginTop: Spacing.two },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: '#111827' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  typeButton: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10 },
  typeSelected: { borderColor: '#2563EB', backgroundColor: '#DBEAFE' },
  submitButton: { backgroundColor: '#2563EB', borderRadius: 16, alignItems: 'center', paddingVertical: 15, marginTop: Spacing.four },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
