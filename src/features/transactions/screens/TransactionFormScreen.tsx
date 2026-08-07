import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, GlyphSize, Type } from '@/constants/theme';
import { findTemplate } from '@/features/accounts/domain/account.templates';
import { CategoryGrid } from '@/features/transactions/components/CategoryGrid';
import { TransactionKeypad } from '@/features/transactions/components/TransactionKeypad';
import type { TransactionType } from '@/features/transactions/domain/transaction.types';
import { createTransaction } from '@/features/transactions/application/createTransaction';
import { useTransactionFormData, useTransactionRepository } from '@/features/transactions/hooks/useTransactions';
import { parseAmountToCents } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date';
import { useTheme } from '@/hooks/use-theme';

const TYPE_OPTIONS: { label: string; type?: TransactionType }[] = [
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
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [accountPicker, setAccountPicker] = useState<'source' | 'target' | null>(null);
  const [noteFocused, setNoteFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const { categories, accounts } = useTransactionFormData(type === 'income' ? 'income' : 'expense');

  // 用 derive 代替 effect 纠正 state，避免额外的渲染循环。
  // state 只记录用户的原始选择，render 时再 clamp 到合法值。
  const effectiveAccountId = accounts.length > 0 && !accounts.some((a) => a.id === accountId)
    ? accounts[0].id
    : accountId;
  const effectiveTransferAccountId = (() => {
    if (accounts.length === 0) return transferAccountId;
    if (!transferAccountId || transferAccountId === effectiveAccountId || !accounts.some((a) => a.id === transferAccountId)) {
      return accounts.find((a) => a.id !== effectiveAccountId)?.id ?? '';
    }
    return transferAccountId;
  })();
  const effectiveCategoryId = (() => {
    if (categories.length === 0 || categories.some((c) => c.id === categoryId)) return categoryId;
    const root = categories.find((c) => c.parentId === null);
    const defaultCat = root ? (categories.find((c) => c.parentId === root.id) ?? root) : undefined;
    return defaultCat?.id ?? categoryId;
  })();

  const selectedAccount = accounts.find((account) => account.id === effectiveAccountId);
  const selectedTransferAccount = accounts.find((account) => account.id === effectiveTransferAccountId);

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    if (nextType === 'transfer') {
      setCategoryId('transfer');
      return;
    }
    setCategoryId(nextType === 'income' ? 'salary-default' : 'food-default');
  }

  function openDatePicker() {
    setPickerMode('date');
    setShowDatePicker(true);
  }

  function handleDateChange(event: DateTimePickerEvent, value?: Date) {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (value) setOccurredAt(value);
    if (Platform.OS === 'android' && pickerMode === 'date' && value) {
      setPickerMode('time');
      return;
    }
    if (Platform.OS === 'android' && event.type === 'set') {
      setShowDatePicker(false);
    }
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

  async function handleSubmit(continueEntry = false) {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await createTransaction(repository, {
        type,
        amountCents: parseAmountToCents(amount),
        categoryId: type === 'transfer' ? 'transfer' : effectiveCategoryId,
        accountId: effectiveAccountId,
        transferAccountId: type === 'transfer' ? effectiveTransferAccountId : undefined,
        occurredAt: occurredAt.toISOString(),
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
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
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
          {type !== 'transfer' ? <CategoryGrid categories={categories} selectedCategoryId={effectiveCategoryId} onCategoryChange={setCategoryId} onSettingsPress={() => router.push('/categories')} /> : <View style={styles.transferHint}><ThemedText style={styles.transferIcon}>⇄</ThemedText><ThemedText style={styles.transferTitle}>账户间转账</ThemedText><ThemedText type="small" themeColor="textSecondary">选择转出和转入账户</ThemedText></View>}

        </ScrollView>

        <View style={styles.quickOptions}>
          <Pressable onPress={() => setAccountPicker('source')} style={styles.quickOption}>
            <View style={[styles.quickIcon, { backgroundColor: '#D3A837' }]}><ThemedText style={styles.quickIconText}>▤</ThemedText></View>
            <ThemedText style={styles.quickText}>{selectedAccount?.name ?? '账户'}</ThemedText>
          </Pressable>
          {type === 'transfer' ? (
            <Pressable onPress={() => setAccountPicker('target')} style={styles.quickOption}>
              <View style={[styles.quickIcon, { backgroundColor: '#2D7185' }]}><ThemedText style={styles.quickIconText}>↗</ThemedText></View>
              <ThemedText style={styles.quickText}>{selectedTransferAccount?.name ?? '转入账户'}</ThemedText>
            </Pressable>
          ) : (
            <>
              <Pressable style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: '#3E9DD0' }]}><ThemedText style={styles.quickIconText}>▣</ThemedText></View><ThemedText style={styles.quickText}>报销</ThemedText></Pressable>
              <Pressable style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: '#1F9B89' }]}><ThemedText style={styles.quickIconText}>#</ThemedText></View><ThemedText style={styles.quickText}>标签</ThemedText></Pressable>
              <Pressable style={styles.quickOption}><View style={[styles.quickIcon, { backgroundColor: '#9B9BA2' }]}><ThemedText style={styles.quickIconText}>＄</ThemedText></View><ThemedText style={styles.quickText}>不计入</ThemedText></Pressable>
            </>
          )}
        </View>

        <View style={styles.inputBar}>
          <Pressable style={styles.downButton}><ThemedText style={styles.downText}>⌄</ThemedText></Pressable>
          <TextInput
            value={note}
            onChangeText={setNote}
            onFocus={() => setNoteFocused(true)}
            onBlur={() => setNoteFocused(false)}
            onSubmitEditing={() => { Keyboard.dismiss(); setNoteFocused(false); }}
            returnKeyType="done"
            blurOnSubmit
            maxLength={150}
            placeholder="请输入备注信息(最多150字)"
            placeholderTextColor="#A8A8AA"
            style={[styles.noteInput, { color: theme.text }]}
          />
          <Pressable onPress={openDatePicker} style={styles.datePill}><ThemedText style={styles.dateIcon}>▦</ThemedText><ThemedText style={styles.dateText}>{formatDateTime(occurredAt)}</ThemedText></Pressable>
          <Pressable onPress={() => { Keyboard.dismiss(); setNoteFocused(false); }}>
            <ThemedText style={[styles.amountPreview, { color: type === 'income' ? '#2D7185' : type === 'transfer' ? '#6A6A74' : '#D85C50' }]}>¥{amount || '0.00'}</ThemedText>
          </Pressable>
        </View>
        {!noteFocused ? <TransactionKeypad disabled={isSubmitting} onKeyPress={handleKeyPress} onBackspace={handleBackspace} onSave={() => void handleSubmit()} onSaveAndContinue={() => void handleSubmit(true)} /> : null}
        <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerCard}>
              <ThemedText style={styles.pickerTitle}>选择日期和时间</ThemedText>
              <DateTimePicker value={occurredAt} mode={Platform.OS === 'ios' ? 'datetime' : pickerMode} display="spinner" onChange={handleDateChange} />
              <Pressable onPress={() => setShowDatePicker(false)} style={styles.pickerDone}><ThemedText style={styles.pickerDoneText}>完成</ThemedText></Pressable>
            </View>
          </View>
        </Modal>
        <Modal visible={accountPicker !== null} transparent animationType="slide" onRequestClose={() => setAccountPicker(null)}>
          <View style={styles.pickerBackdrop}>
            <View style={styles.accountSheet}>
              <ThemedText style={styles.pickerTitle}>{accountPicker === 'target' ? '选择转入账户' : '选择账户'}</ThemedText>
              {accounts.filter((account) => accountPicker !== 'target' || account.id !== effectiveAccountId).map((account) => (
                <Pressable key={account.id} style={styles.accountChoice} onPress={() => {
                  if (accountPicker === 'target') setTransferAccountId(account.id);
                  else setAccountId(account.id);
                  setAccountPicker(null);
                }}>
                  <ThemedText style={styles.accountChoiceName}>{account.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{findTemplate(account.type)?.label ?? '其他'}</ThemedText>
                </Pressable>
              ))}
              <Pressable onPress={() => setAccountPicker(null)} style={styles.pickerCancel}><ThemedText themeColor="textSecondary">取消</ThemedText></Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  topPanel: { backgroundColor: '#F5F7FA', paddingHorizontal: 10, paddingBottom: 7 },
  header: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 32, lineHeight: 34, color: '#17212B', fontWeight: FontWeight.regular },
  typeBar: { flex: 1 },
  typeBarContent: { flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  typeItem: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 20 },
  activeType: { backgroundColor: '#1C2128' },
  typeText: { ...Type.body, fontWeight: FontWeight.semibold, color: '#71808C' },
  activeTypeText: { color: '#FFFFFF' },
  disabledTypeItem: { opacity: 0.45 },
  disabledType: { color: '#9AABB0' },
  settings: { fontSize: GlyphSize.lg, color: '#71808C' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 10 },
  transferHint: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, gap: 7 },
  transferIcon: { fontSize: GlyphSize.xxl, color: '#5A6B78' },
  transferTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  quickOptions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, gap: 8, backgroundColor: '#FFFFFF' },
  quickOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 3 },
  quickIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { color: '#FFFFFF', fontWeight: FontWeight.bold, fontSize: GlyphSize.sm },
  quickText: { ...Type.footnote, fontWeight: FontWeight.semibold, color: '#3E403E' },
  inputBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 7, borderTopWidth: 1, borderColor: '#E6ECE8', backgroundColor: '#FFFFFF' },
  downButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  downText: { fontSize: GlyphSize.lg, lineHeight: 26, color: '#4A6070' },
  noteInput: { flex: 1, minWidth: 70, ...Type.body, paddingVertical: 8, color: '#6E7772' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 8, borderRadius: 14, backgroundColor: '#ECEEF0' },
  dateIcon: { color: '#5A6B78', fontSize: GlyphSize.sm },
  dateText: { ...Type.footnote, fontWeight: FontWeight.semibold },
  amountPreview: { ...Type.title, fontWeight: FontWeight.bold, letterSpacing: -0.3, minWidth: 78, textAlign: 'right' },
  pickerBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(20, 28, 32, 0.35)' },
  pickerCard: { borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  pickerTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  pickerDone: { alignSelf: 'stretch', alignItems: 'center', borderRadius: 12, paddingVertical: 11, backgroundColor: '#167C80' },
  pickerDoneText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  accountSheet: { borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', gap: 8 },
  accountChoice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECEDEF' },
  accountChoiceName: { ...Type.body, fontWeight: FontWeight.semibold },
  pickerCancel: { alignItems: 'center', paddingVertical: 10 },
});
