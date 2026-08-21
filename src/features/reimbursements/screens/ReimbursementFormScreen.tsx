import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { findBrandAssets } from '@/features/accounts/domain/account.brands';
import type { AccountBalance } from '@/features/accounts/domain/account.types';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { ReimbursementBillPickerSheet } from '@/features/reimbursements/components/ReimbursementBillPickerSheet';
import { AccountPickerSheet, type AccountPickerKind } from '@/features/transactions/components/AccountPickerSheet';
import { DateTimePickerSheet } from '@/features/transactions/components/DateTimePickerSheet';
import type { Transaction } from '@/features/transactions/domain/transaction.types';
import { useTransactionRepository } from '@/features/transactions/hooks/useTransactions';
import { formatCurrency, parseAmountToCents } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date';

const ENTRY_OPTIONS = ['支出', '收入', '转账', '借还', '报销', '退款'] as const;

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function AccountValue({ account }: { account: AccountBalance | undefined }) {
  const brand = account ? findBrandAssets(account.type) : undefined;
  return (
    <View style={styles.accountValue}>
      {account ? (
        <View style={[styles.accountIconBox, !brand?.icon && { backgroundColor: `${account.color}20` }]}>
          {brand?.icon ? (
            <Image
              source={brand.icon}
              style={styles.accountIconImage}
              contentFit={brand.iconFit ?? 'contain'}
              contentPosition={brand.iconPosition ?? 'center'}
            />
          ) : (
            <ThemedText style={styles.accountIcon}>{account.icon}</ThemedText>
          )}
        </View>
      ) : null}
      <ThemedText style={[styles.accountName, !account && styles.emptyAccountName]} numberOfLines={1}>
        {account?.name ?? '不选择'}
      </ThemedText>
      <ThemedText style={styles.chevron}>›</ThemedText>
    </View>
  );
}

export function ReimbursementFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string }>();
  const transactionId = typeof params.transactionId === 'string' ? params.transactionId : null;
  const repository = useTransactionRepository();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [receiveAccountId, setReceiveAccountId] = useState('');
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [note, setNote] = useState('');
  const [excludedFromStats, setExcludedFromStats] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(transactionId));
  const [loadedExpenseQuery, setLoadedExpenseQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [showBillPicker, setShowBillPicker] = useState(false);
  const [accountPicker, setAccountPicker] = useState<AccountPickerKind | null>(null);
  const [accountPickerContent, setAccountPickerContent] = useState<AccountPickerKind>('source');
  const [accountPickerMounted, setAccountPickerMounted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMounted, setDatePickerMounted] = useState(false);
  const [pickerDraft, setPickerDraft] = useState(new Date());

  const effectiveSourceAccountId = accounts.some((account) => account.id === sourceAccountId)
    ? sourceAccountId
    : '';
  const effectiveReceiveAccountId = accounts.some((account) => account.id === receiveAccountId)
    ? receiveAccountId
    : accounts[0]?.id ?? '';
  const sourceAccount = accounts.find((account) => account.id === effectiveSourceAccountId);
  const receiveAccount = accounts.find((account) => account.id === effectiveReceiveAccountId);
  const selectedExpenses = useMemo(
    () => expenses.filter((expense) => selectedExpenseIds.includes(expense.id)),
    [expenses, selectedExpenseIds]
  );
  const selectedTotalCents = selectedExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const expenseQueryKey = transactionId ?? 'new';
  const loadingExpenses = loadedExpenseQuery !== expenseQueryKey;

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    void repository.getById(transactionId)
      .then((transaction) => {
        if (cancelled) return;
        if (!transaction || transaction.categoryId !== 'reimbursement') {
          Alert.alert('报销记录不存在', '这条记录可能已删除。', [{ text: '返回', onPress: () => router.back() }]);
          return;
        }
        setSourceAccountId(transaction.reimbursementSourceAccountId ?? '');
        setReceiveAccountId(transaction.accountId);
        setSelectedExpenseIds(transaction.reimbursedExpenseIds);
        setAmount(centsToInput(transaction.amountCents));
        setOccurredAt(new Date(transaction.occurredAt));
        setNote(transaction.note);
        setExcludedFromStats(transaction.excludedFromStats);
        setLoadingExisting(false);
      })
      .catch((error) => {
        if (cancelled) return;
        Alert.alert('无法读取报销记录', error instanceof Error ? error.message : '请稍后重试');
        setLoadingExisting(false);
      });
    return () => { cancelled = true; };
  }, [repository, router, transactionId]);

  useEffect(() => {
    if (loadingExisting) return;
    let cancelled = false;
    void repository.listReimbursableExpenses(transactionId ?? undefined)
      .then((items) => {
        if (cancelled) return;
        setExpenses(items);
        setSelectedExpenseIds((ids) => ids.filter((id) => items.some((item) => item.id === id)));
      })
      .catch((error) => {
        if (!cancelled) Alert.alert('无法读取账单', error instanceof Error ? error.message : '请稍后重试');
      })
      .finally(() => { if (!cancelled) setLoadedExpenseQuery(expenseQueryKey); });
    return () => { cancelled = true; };
  }, [expenseQueryKey, loadingExisting, repository, transactionId]);

  function navigateEntry(label: typeof ENTRY_OPTIONS[number]) {
    if (transactionId || label === '报销' || label === '借还' || label === '退款') return;
    const draftType = label === '收入' ? 'income' : label === '转账' ? 'transfer' : 'expense';
    router.replace({ pathname: '/transaction/create', params: { draftType } });
  }

  function openAccountPicker(kind: AccountPickerKind) {
    setAccountPickerContent(kind);
    setAccountPicker(kind);
    setAccountPickerMounted(true);
  }

  function handleExpenseSelection(ids: string[]) {
    setSelectedExpenseIds(ids);
    const total = expenses
      .filter((expense) => ids.includes(expense.id))
      .reduce((sum, expense) => sum + expense.amountCents, 0);
    setAmount(total > 0 ? centsToInput(total) : '');
  }

  function openDatePicker() {
    setPickerDraft(occurredAt);
    setDatePickerMounted(true);
    setShowDatePicker(true);
  }

  const handleAccountPickerClosed = useCallback(() => setAccountPickerMounted(false), []);
  const handleDatePickerClosed = useCallback(() => setDatePickerMounted(false), []);

  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const draft = {
        amountCents: parseAmountToCents(amount),
        sourceAccountId: effectiveSourceAccountId || undefined,
        receiveAccountId: effectiveReceiveAccountId,
        expenseTransactionIds: selectedExpenseIds,
        occurredAt: occurredAt.toISOString(),
        note,
        excludedFromStats,
      };
      if (transactionId) await repository.updateReimbursement(transactionId, draft);
      else await repository.createReimbursement(draft);
      router.back();
    } catch (error) {
      Alert.alert('无法保存报销', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (accountsLoading || loadingExisting) {
    return (
      <ThemedView style={styles.container}>
        <AppBackground />
        <SafeAreaView style={styles.loadingState}>
          <ThemedText style={styles.loadingText}>正在准备报销信息…</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5DDE6" />
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.topPanel}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSideButton}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeBarContent}>
            {ENTRY_OPTIONS.map((label) => {
              const active = label === '报销';
              const disabled = Boolean(transactionId) || label === '借还' || label === '退款';
              return (
                <Pressable
                  key={label}
                  disabled={disabled || active}
                  onPress={() => navigateEntry(label)}
                  style={[styles.typeItem, active && styles.activeType, disabled && !active && styles.disabledTypeItem]}>
                  <ThemedText style={[styles.typeText, active && styles.activeTypeText]}>{label}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.headerSideButton}>
            <ThemedText style={styles.settings}>⚙</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.pageHint}>关联待报销支出，并记录实际收到的报销款</ThemedText>

          <View style={styles.formGroup}>
            <Pressable
              onPress={() => openAccountPicker('source')}
              style={({ pressed }) => [styles.compactRow, pressed && styles.pressed]}>
              <View style={styles.rowLabelLine}>
                <ThemedText style={styles.rowLabel}>报销账户</ThemedText>
                <View style={styles.optionalBadge}><ThemedText style={styles.optionalText}>选填</ThemedText></View>
              </View>
              <AccountValue account={sourceAccount} />
            </Pressable>

            <Pressable
              disabled={loadingExpenses}
              onPress={() => setShowBillPicker(true)}
              style={({ pressed }) => [styles.compactRow, styles.rowDivider, pressed && styles.pressed]}>
              <ThemedText style={styles.rowLabel}>报销账单</ThemedText>
              <View style={styles.billValue}>
                <View style={styles.billValueCopy}>
                  <ThemedText style={[styles.rowValue, selectedExpenseIds.length > 0 && styles.selectedRowValue]} numberOfLines={1}>
                    {loadingExpenses
                      ? '读取中…'
                      : selectedExpenseIds.length > 0
                        ? `已选 ${selectedExpenseIds.length} 笔`
                        : '请选择'}
                  </ThemedText>
                  <ThemedText style={styles.rowMeta} numberOfLines={1}>
                    {selectedTotalCents > 0 ? formatCurrency(selectedTotalCents) : `${expenses.length} 笔可选`}
                  </ThemedText>
                </View>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <View style={[styles.compactRow, styles.amountRow]}>
              <ThemedText style={styles.rowLabel}>报销金额</ThemedText>
              <View style={styles.amountValue}>
                <ThemedText style={styles.currency}>¥</ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={AppPalette.textFaint}
                  style={styles.amountInput}
                />
              </View>
            </View>

            <Pressable
              onPress={() => openAccountPicker('target')}
              style={({ pressed }) => [styles.compactRow, styles.rowDivider, pressed && styles.pressed]}>
              <ThemedText style={styles.rowLabel}>收款账户</ThemedText>
              <AccountValue account={receiveAccount} />
            </Pressable>

            <Pressable
              onPress={openDatePicker}
              style={({ pressed }) => [styles.compactRow, styles.rowDivider, pressed && styles.pressed]}>
              <ThemedText style={styles.rowLabel}>报销时间</ThemedText>
              <View style={styles.inlineValue}>
                <ThemedText style={styles.rowValue}>{formatDateTime(occurredAt)}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </Pressable>

            <View style={[styles.compactRow, styles.rowDivider]}>
              <View style={styles.statsLabelCopy}>
                <ThemedText style={styles.rowLabel}>不计入收支</ThemedText>
                <ThemedText style={styles.rowMeta}>只影响统计，不影响账户余额</ThemedText>
              </View>
              <Switch
                value={excludedFromStats}
                onValueChange={setExcludedFromStats}
                trackColor={{ false: AppPalette.lineStrong, true: AppPalette.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.compactRow, styles.rowDivider]}>
              <ThemedText style={styles.rowLabel}>备注</ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={150}
                placeholder="选填"
                placeholderTextColor={AppPalette.textMuted}
                style={styles.noteInput}
              />
            </View>
          </View>

          <Pressable
            disabled={submitting}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [styles.saveButton, submitting && styles.saveButtonDisabled, pressed && styles.pressed]}>
            <ThemedText style={styles.saveText}>{submitting ? '保存中…' : transactionId ? '保存修改' : '保存报销'}</ThemedText>
          </Pressable>
        </ScrollView>

        <ReimbursementBillPickerSheet
          visible={showBillPicker}
          expenses={expenses}
          selectedIds={selectedExpenseIds}
          onChange={handleExpenseSelection}
          onClose={() => setShowBillPicker(false)}
        />
        <AccountPickerSheet
          kind={accountPicker}
          displayKind={accountPickerContent}
          mounted={accountPickerMounted}
          accounts={accounts}
          sourceAccountId={effectiveSourceAccountId}
          targetAccountId={effectiveReceiveAccountId}
          transferMode={false}
          allowEmpty={accountPickerContent === 'source'}
          emptyLabel="不选择报销账户"
          titleOverride={accountPickerContent === 'source' ? '选择报销账户' : '选择收款账户'}
          onClose={() => setAccountPicker(null)}
          onClosed={handleAccountPickerClosed}
          onSelect={(kind, id) => {
            if (kind === 'source') {
              setSourceAccountId(id);
            } else {
              setReceiveAccountId(id);
            }
            setAccountPicker(null);
          }}
        />
        <DateTimePickerSheet
          visible={showDatePicker}
          mounted={datePickerMounted}
          value={pickerDraft}
          onChange={setPickerDraft}
          onClose={() => setShowDatePicker(false)}
          onClosed={handleDatePickerClosed}
          onConfirm={() => {
            setOccurredAt(pickerDraft);
            setShowDatePicker(false);
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppPalette.surface },
  safeArea: { flex: 1 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Type.body, color: AppPalette.textMuted, fontWeight: FontWeight.medium },
  topPanel: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.46)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)' },
  headerSideButton: { width: 34, height: 34, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, lineHeight: 34, color: AppPalette.ink, fontWeight: FontWeight.regular },
  settings: { ...Glyph.md, color: AppPalette.textMuted },
  typeBarContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  typeItem: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 16 },
  activeType: { backgroundColor: AppPalette.primary },
  disabledTypeItem: { opacity: 0.42 },
  typeText: { ...Type.body, color: AppPalette.textMuted, fontWeight: FontWeight.semibold },
  activeTypeText: { color: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 22, gap: 9 },
  pageHint: { ...Type.footnote, color: AppPalette.textMuted, paddingHorizontal: 4, paddingVertical: 2 },
  formGroup: { overflow: 'hidden', borderRadius: 14, paddingHorizontal: 13, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: AppPalette.line },
  compactRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: AppPalette.line },
  rowLabelLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { ...Type.body, color: AppPalette.ink, fontWeight: FontWeight.medium },
  optionalBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, backgroundColor: AppPalette.surfaceMuted },
  optionalText: { ...Type.caption, color: AppPalette.textMuted },
  rowValue: { ...Type.footnote, ...Numeric, color: AppPalette.textMuted },
  selectedRowValue: { color: AppPalette.primary, fontWeight: FontWeight.semibold },
  rowMeta: { ...Type.caption, ...Numeric, color: AppPalette.textMuted },
  inlineValue: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  accountValue: { maxWidth: '62%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  accountIconBox: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  accountIconImage: { width: 24, height: 24, borderRadius: 12 },
  accountIcon: { ...Glyph.sm },
  accountName: { flexShrink: 1, ...Type.footnote, color: AppPalette.inkSoft, fontWeight: FontWeight.medium },
  emptyAccountName: { color: AppPalette.textMuted, fontWeight: FontWeight.regular },
  chevron: { fontSize: 24, lineHeight: 26, color: AppPalette.textFaint },
  billValue: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  billValueCopy: { alignItems: 'flex-end', gap: 1 },
  amountRow: { minHeight: 56 },
  amountValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  currency: { ...Type.body, color: AppPalette.primary, fontWeight: FontWeight.semibold },
  amountInput: { minWidth: 90, maxWidth: 170, ...Type.title, ...Numeric, color: AppPalette.ink, fontWeight: FontWeight.semibold, textAlign: 'right', paddingVertical: 7 },
  statsLabelCopy: { gap: 1 },
  noteInput: { flex: 1, ...Type.body, color: AppPalette.ink, textAlign: 'right', paddingVertical: 7 },
  saveButton: { minHeight: 46, marginHorizontal: 3, marginTop: 2, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.primary },
  saveButtonDisabled: { backgroundColor: AppPalette.lineStrong },
  saveText: { ...Type.headline, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  pressed: { opacity: 0.7 },
});
