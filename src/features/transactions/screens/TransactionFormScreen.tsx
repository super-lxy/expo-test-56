import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryGrid } from '@/features/transactions/components/CategoryGrid';
import { TransactionKeypad } from '@/features/transactions/components/TransactionKeypad';
import type { TransactionType } from '@/features/transactions/domain/transaction.types';
import { createTransaction } from '@/features/transactions/application/createTransaction';
import { useTransactionFormData, useTransactionRepository } from '@/features/transactions/hooks/useTransactions';
import { parseAmountToCents } from '@/shared/utils/currency';
import { formatDate } from '@/shared/utils/date';
import { useTheme } from '@/hooks/use-theme';

const TYPE_OPTIONS: Array<{ label: string; type?: TransactionType }> = [
  { label: '支出', type: 'expense' },
  { label: '收入', type: 'income' },
  { label: '转账', type: 'transfer' },
  { label: '借还' },
  { label: '报销' },
  { label: '退款' },
];

export function TransactionFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const repository = useTransactionRepository();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [accountId, setAccountId] = useState('cash');
  const [transferAccountId, setTransferAccountId] = useState('');
  const { categories, accounts } = useTransactionFormData(type === 'income' ? 'income' : 'expense');
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedTransferAccount = accounts.find((account) => account.id === transferAccountId);

  useEffect(() => {
    if (accounts.length === 0) return;
    if (!accounts.some((account) => account.id === accountId)) {
      setAccountId(accounts[0].id);
    }
    if (!transferAccountId || transferAccountId === accountId || !accounts.some((account) => account.id === transferAccountId)) {
      setTransferAccountId(accounts.find((account) => account.id !== accountId)?.id ?? '');
    }
  }, [accountId, accounts, transferAccountId]);

  useEffect(() => {
    const leafCategory = categories.find((category) => !categories.some((child) => child.parentId === category.id));
    if (leafCategory && !categories.some((category) => category.id === categoryId)) {
      setCategoryId(leafCategory.id);
    }
  }, [categories, categoryId]);

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategoryId(nextType === 'income' ? 'salary' : nextType === 'transfer' ? 'transfer' : 'food');
  }

  function handleKeyPress(key: string) {
    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount(amount ? `${amount}.` : '0.');
      return;
    }
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
    setAmount(amount === '0' ? key : `${amount}${key}`);
  }

  function handleBackspace() {
    setAmount((value) => value.slice(0, -1));
  }

  function cycleAccount() {
    if (accounts.length < 2) return;
    const currentIndex = accounts.findIndex((account) => account.id === accountId);
    setAccountId(accounts[(currentIndex + 1) % accounts.length].id);
  }

  function cycleTransferAccount() {
    const candidates = accounts.filter((account) => account.id !== accountId);
    if (candidates.length === 0) return;
    const currentIndex = candidates.findIndex((account) => account.id === transferAccountId);
    setTransferAccountId(candidates[(currentIndex + 1) % candidates.length].id);
  }

  async function handleSubmit(continueEntry = false) {
    try {
      await createTransaction(repository, {
        type,
        amountCents: parseAmountToCents(amount),
        categoryId: type === 'transfer' ? 'transfer' : categoryId,
        accountId,
        transferAccountId: type === 'transfer' ? transferAccountId : undefined,
        occurredAt: new Date().toISOString(),
        note,
      });
      if (continueEntry) {
        setAmount('');
        setNote('');
      } else {
        router.back();
      }
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8E8ED" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.topPanel}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}><ThemedText style={styles.back}>‹</ThemedText></Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeBar} contentContainerStyle={styles.typeBarContent}>
              {TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  disabled={!option.type}
                  onPress={() => option.type && handleTypeChange(option.type)}
                    style={[styles.typeItem, option.type === type && styles.activeType, !option.type && styles.disabledTypeItem]}>
                  <ThemedText style={[styles.typeText, option.type === type && styles.activeTypeText, !option.type && styles.disabledType]}>{option.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}><ThemedText style={styles.settings}>⚙</ThemedText></Pressable>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {type !== 'transfer' ? <CategoryGrid categories={categories} selectedCategoryId={categoryId} onCategoryChange={setCategoryId} /> : <View style={styles.transferHint}><ThemedText style={styles.transferIcon}>⇄</ThemedText><ThemedText style={styles.transferTitle}>账户间转账</ThemedText><ThemedText type="small" themeColor="textSecondary">选择转出和转入账户</ThemedText></View>}

          <View style={styles.quickOptions}>
            <Pressable onPress={cycleAccount} style={styles.quickOption}>
              <View style={[styles.quickIcon, { backgroundColor: '#D3A837' }]}><ThemedText style={styles.quickIconText}>▤</ThemedText></View>
              <ThemedText style={styles.quickText}>{selectedAccount?.name ?? '账户'}</ThemedText>
            </Pressable>
            {type === 'transfer' ? (
              <Pressable onPress={cycleTransferAccount} style={styles.quickOption}>
                <View style={[styles.quickIcon, { backgroundColor: '#2D7185' }]}><ThemedText style={styles.quickIconText}>↗</ThemedText></View>
                <ThemedText style={styles.quickText}>{selectedTransferAccount?.name ?? '转入账户'}</ThemedText>
              </Pressable>
            ) : (
              <>
                <View style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: '#3E9DD0' }]}><ThemedText style={styles.quickIconText}>▣</ThemedText></View><ThemedText style={styles.quickText}>报销</ThemedText></View>
                <View style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: '#1F9B89' }]}><ThemedText style={styles.quickIconText}>#</ThemedText></View><ThemedText style={styles.quickText}>标签</ThemedText></View>
                <View style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: '#9B9BA2' }]}><ThemedText style={styles.quickIconText}>＄</ThemedText></View><ThemedText style={styles.quickText}>不计入</ThemedText></View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.inputBar}>
          <Pressable style={styles.downButton}><ThemedText style={styles.downText}>⌄</ThemedText></Pressable>
          <TextInput value={note} onChangeText={setNote} placeholder="请输入备注信息（最多100字）" placeholderTextColor="#A8A8AA" style={[styles.noteInput, { color: theme.text }]} />
          <View style={styles.datePill}><ThemedText style={styles.dateIcon}>▦</ThemedText><ThemedText style={styles.dateText}>{formatDate(new Date().toISOString())}</ThemedText></View>
          <ThemedText style={[styles.amountPreview, { color: type === 'income' ? '#2D7185' : type === 'transfer' ? '#6A6A74' : '#D85C50' }]}>¥{amount || '0.00'}</ThemedText>
        </View>
        <TransactionKeypad onKeyPress={handleKeyPress} onBackspace={handleBackspace} onSave={() => void handleSubmit()} onSaveAndContinue={() => void handleSubmit(true)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FA' },
  safeArea: { flex: 1, backgroundColor: '#F5F4FA' },
  topPanel: { backgroundColor: '#E8E8ED', paddingHorizontal: 10, paddingBottom: 7 },
  header: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 37, lineHeight: 38, color: '#1F3528', fontWeight: '300' },
  typeBar: { flex: 1 },
  typeBarContent: { flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  typeItem: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 20 },
  activeType: { backgroundColor: '#2D7185' },
  typeText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#1D2A24' },
  activeTypeText: { color: '#FFFFFF' },
  disabledTypeItem: { opacity: 0.72 },
  disabledType: { color: '#5F6068' },
  settings: { fontSize: 24, color: '#777780' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  transferHint: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, gap: 7 },
  transferIcon: { fontSize: 50, color: '#607B6C' },
  transferTitle: { fontSize: 18, fontWeight: '800' },
  quickOptions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingTop: 5, paddingBottom: 8, gap: 7 },
  quickOption: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 19, paddingRight: 9, paddingLeft: 4, paddingVertical: 4, shadowColor: '#9B9BA5', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  quickIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  quickText: { fontSize: 12, lineHeight: 17, fontWeight: '700', color: '#3E403E' },
  inputBar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 8, borderTopWidth: 1, borderColor: '#ECECEE', backgroundColor: '#FFFFFF' },
  downButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#E8E8ED', alignItems: 'center', justifyContent: 'center' },
  downText: { fontSize: 28, lineHeight: 30, color: '#2D7185' },
  noteInput: { flex: 1, minWidth: 70, fontSize: 14, paddingVertical: 8 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 17, backgroundColor: '#E8E8ED' },
  dateIcon: { color: '#2D7185', fontSize: 17 },
  dateText: { fontSize: 13, fontWeight: '700' },
  amountPreview: { fontSize: 24, fontWeight: '800', minWidth: 82, textAlign: 'right' },
});
