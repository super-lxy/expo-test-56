import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { findBrandAssets } from '@/features/accounts/domain/account.brands';
import { EXTERNAL_TRANSFER_ACCOUNT_ID } from '@/features/accounts/domain/systemAccounts';
import type { Category } from '@/features/categories/domain/category.types';
import { AccountPickerSheet, type AccountPickerKind } from '@/features/transactions/components/AccountPickerSheet';
import { CategoryGrid } from '@/features/transactions/components/CategoryGrid';
import {
  TransferFormPanel,
  type TransferAdjustmentMode,
} from '@/features/transactions/components/TransferFormPanel';
import { TransactionKeypad } from '@/features/transactions/components/TransactionKeypad';
import { TagPickerSheet } from '@/features/tags/components/TagPickerSheet';
import type { TransactionDraft, TransactionType } from '@/features/transactions/domain/transaction.types';
import { createTransaction } from '@/features/transactions/application/createTransaction';
import { updateTransaction } from '@/features/transactions/application/updateTransaction';
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

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function TransactionFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string }>();
  const transactionId = typeof params.transactionId === 'string' ? params.transactionId : null;
  const isEditing = transactionId !== null;
  const theme = useTheme();
  const repository = useTransactionRepository();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [transferAdjustment, setTransferAdjustment] = useState('');
  const [transferAdjustmentMode, setTransferAdjustmentMode] = useState<TransferAdjustmentMode>('fee');
  const [activeAmountField, setActiveAmountField] = useState<'amount' | 'adjustment'>('amount');
  const [note, setNote] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagPickerMounted, setTagPickerMounted] = useState(false);
  const openTagManagerAfterCloseRef = useRef(false);
  const [categoryId, setCategoryId] = useState('food');
  const [accountId, setAccountId] = useState('cash');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [accountPicker, setAccountPicker] = useState<'source' | 'target' | null>(null);
  const [accountPickerContent, setAccountPickerContent] = useState<AccountPickerKind>('source');
  const [accountPickerMounted, setAccountPickerMounted] = useState(false);
  // 键盘区始终渲染（不卸载），只用 opacity/pointerEvents 切换。
  // 卸载键盘区会让 scroll 扩缩 ~280px，引起整屏跳闪。
  // keyboardDidShow/keyboardDidHide 在动画完成后才触发，
  // 确保切换时系统键盘已经完全盖住/离开键盘区域。
  const [keypadVisible, setKeypadVisible] = useState(true);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeypadVisible(false));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeypadVisible(true));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(isEditing);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const submittingRef = useRef(false);
  const { categories, accounts } = useTransactionFormData(type === 'income' ? 'income' : 'expense');
  const formCategories = editingCategory && !categories.some((category) => category.id === editingCategory.id)
    ? [editingCategory, ...categories]
    : categories;

  useEffect(() => {
    if (!transactionId) return;

    let cancelled = false;
    void repository.getById(transactionId)
      .then((existing) => {
        if (cancelled) return;
        if (!existing) {
          Alert.alert('账单不存在', '这条账单可能已被删除。', [
            { text: '返回', onPress: () => router.back() },
          ]);
          return;
        }

        setType(existing.type);
        setAmount(centsToInput(existing.amountCents));
        const adjustmentMode: TransferAdjustmentMode = existing.discountCents > 0 ? 'discount' : 'fee';
        setTransferAdjustmentMode(adjustmentMode);
        setTransferAdjustment(centsToInput(
          adjustmentMode === 'discount' ? existing.discountCents : existing.feeCents
        ));
        setActiveAmountField('amount');
        setNote(existing.note);
        setTagIds(existing.tags.map((tag) => tag.id));
        setCategoryId(existing.categoryId);
        setEditingCategory({
          id: existing.categoryId,
          name: existing.categoryName,
          type: existing.type === 'income' ? 'income' : 'expense',
          parentId: null,
          icon: existing.categoryIcon,
          iconType: existing.categoryIconType,
          iconBlob: null,
          iconMime: null,
          color: existing.categoryColor,
        });
        setAccountId(existing.accountId);
        setTransferAccountId(existing.transferAccountId ?? '');
        setOccurredAt(new Date(existing.occurredAt));
        setIsLoadingExisting(false);
      })
      .catch((error) => {
        if (cancelled) return;
        Alert.alert('无法读取账单', error instanceof Error ? error.message : '请稍后重试', [
          { text: '返回', onPress: () => router.back() },
        ]);
      });

    return () => { cancelled = true; };
  }, [repository, router, transactionId]);

  // 用 derive 代替 effect 纠正 state，避免额外的渲染循环。
  // state 只记录用户的原始选择，render 时再 clamp 到合法值。
  const accountIdIsAllowed = accounts.some((account) => account.id === accountId)
    || (type === 'transfer' && accountId === EXTERNAL_TRANSFER_ACCOUNT_ID);
  const effectiveAccountId = accounts.length > 0 && !accountIdIsAllowed
    ? accounts[0].id
    : accountId;
  const effectiveTransferAccountId = (() => {
    const isExternalTarget = transferAccountId === EXTERNAL_TRANSFER_ACCOUNT_ID;
    const isConcreteTarget = accounts.some((account) => account.id === transferAccountId);
    if (
      transferAccountId
      && transferAccountId !== effectiveAccountId
      && (isConcreteTarget || (isExternalTarget && effectiveAccountId !== EXTERNAL_TRANSFER_ACCOUNT_ID))
    ) {
      return transferAccountId;
    }
    const concreteFallback = accounts.find((account) => account.id !== effectiveAccountId)?.id;
    if (concreteFallback) return concreteFallback;
    return effectiveAccountId && effectiveAccountId !== EXTERNAL_TRANSFER_ACCOUNT_ID
      ? EXTERNAL_TRANSFER_ACCOUNT_ID
      : '';
  })();
  const effectiveCategoryId = (() => {
    if (formCategories.length === 0 || formCategories.some((c) => c.id === categoryId)) return categoryId;
    const root = formCategories.find((c) => c.parentId === null);
    const defaultCat = root ? (formCategories.find((c) => c.parentId === root.id) ?? root) : undefined;
    return defaultCat?.id ?? categoryId;
  })();

  const selectedAccount = accounts.find((account) => account.id === effectiveAccountId);
  const selectedTransferAccount = accounts.find((account) => account.id === effectiveTransferAccountId);
  const sourceAccountIsExternal = effectiveAccountId === EXTERNAL_TRANSFER_ACCOUNT_ID;
  const targetAccountIsExternal = effectiveTransferAccountId === EXTERNAL_TRANSFER_ACCOUNT_ID;
  const selectedAccountBrand = selectedAccount ? findBrandAssets(selectedAccount.type) : undefined;

  function openAccountPicker(kind: AccountPickerKind) {
    setAccountPickerContent(kind);
    setAccountPicker(kind);
    setAccountPickerMounted(true);
  }

  function closeAccountPicker() {
    setAccountPicker(null);
  }

  const handleAccountPickerClosed = useCallback(() => {
    setAccountPickerMounted(false);
  }, []);

  const handleTagPickerClosed = useCallback(() => {
    setTagPickerMounted(false);
    if (!openTagManagerAfterCloseRef.current) return;
    openTagManagerAfterCloseRef.current = false;
    requestAnimationFrame(() => router.push('/tags'));
  }, [router]);

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setActiveAmountField('amount');
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
    const editingAdjustment = type === 'transfer' && activeAmountField === 'adjustment';
    const currentValue = editingAdjustment ? transferAdjustment : amount;
    let nextValue = currentValue;

    if (key === '.') {
      if (currentValue.includes('.')) return;
      nextValue = currentValue ? `${currentValue}.` : '0.';
    } else {
      if (currentValue.includes('.') && currentValue.split('.')[1].length >= 2) return;
      nextValue = currentValue === '0' ? key : `${currentValue}${key}`;
    }

    if (editingAdjustment) setTransferAdjustment(nextValue);
    else setAmount(nextValue);
  }

  function handleBackspace() {
    if (type === 'transfer' && activeAmountField === 'adjustment') {
      setTransferAdjustment((value) => value.slice(0, -1));
    } else {
      setAmount((value) => value.slice(0, -1));
    }
  }

  async function handleSubmit(continueEntry = false) {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      let submittedCategoryId = effectiveCategoryId;
      if (type === 'transfer') {
        submittedCategoryId = isEditing && categoryId === 'initial-balance'
          ? 'initial-balance'
          : 'transfer';
      }
      const draft: TransactionDraft = {
        type,
        amountCents: parseAmountToCents(amount),
        feeCents: type === 'transfer' && transferAdjustmentMode === 'fee'
          ? parseAmountToCents(transferAdjustment)
          : 0,
        discountCents: type === 'transfer' && transferAdjustmentMode === 'discount'
          ? parseAmountToCents(transferAdjustment)
          : 0,
        categoryId: submittedCategoryId,
        accountId: effectiveAccountId,
        transferAccountId: type === 'transfer' ? effectiveTransferAccountId : undefined,
        occurredAt: occurredAt.toISOString(),
        note,
        tagIds,
      };
      if (transactionId) {
        await updateTransaction(repository, transactionId, draft);
      } else {
        await createTransaction(repository, draft);
      }

      if (continueEntry && !transactionId) {
        setAmount('');
        setTransferAdjustment('');
        setActiveAmountField('amount');
        setNote('');
        setTagIds([]);
      } else {
        Keyboard.dismiss();
        router.back();
      }
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const waitingForFormData = isEditing
    && (accounts.length === 0 || (type !== 'transfer' && formCategories.length === 0));

  if (isLoadingExisting || waitingForFormData) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5DDE6" />
        <AppBackground />
        <SafeAreaView edges={['top', 'bottom']} style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>正在读取账单…</ThemedText>
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
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSideButton}><ThemedText style={styles.back}>‹</ThemedText></Pressable>
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
            <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.headerSideButton}><ThemedText style={styles.settings}>⚙</ThemedText></Pressable>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {/* 键盘出现时铺一层透明遮罩：点分类格或空白处都能收起键盘 */}
          {!keypadVisible ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => Keyboard.dismiss()} />
          ) : null}
          {type !== 'transfer' ? (
            <CategoryGrid
              categories={formCategories}
              selectedCategoryId={effectiveCategoryId}
              onCategoryChange={setCategoryId}
              onSettingsPress={() => router.push('/categories')}
              onAddChildPress={(parent) => router.push({
                pathname: '/categories/create',
                params: {
                  type: type === 'income' ? 'income' : 'expense',
                  parentId: parent.id,
                  parentName: parent.name,
                  ...(parent.iconType === 'emoji' ? { parentIcon: parent.icon } : {}),
                },
              })}
            />
          ) : (
            <TransferFormPanel
              sourceAccount={selectedAccount}
              targetAccount={selectedTransferAccount}
              sourceExternal={sourceAccountIsExternal}
              targetExternal={targetAccountIsExternal}
              adjustmentMode={transferAdjustmentMode}
              adjustmentAmount={transferAdjustment}
              onSelectSource={() => openAccountPicker('source')}
              onSelectTarget={() => openAccountPicker('target')}
              onAdjustmentModeChange={(mode) => {
                setTransferAdjustmentMode(mode);
                setActiveAmountField('adjustment');
              }}
              onAdjustmentPress={() => setActiveAmountField('adjustment')}
            />
          )}
        </ScrollView>

        {type !== 'transfer' ? <View style={styles.quickOptions}>
          <Pressable onPress={() => openAccountPicker('source')} style={[styles.quickOption, styles.accountQuickOption]}>
            <View style={styles.quickAccountIconBox}>
              {selectedAccountBrand?.icon ? (
                <Image
                  source={selectedAccountBrand.icon}
                  style={styles.quickAccountIcon}
                  contentFit={selectedAccountBrand.iconFit ?? 'contain'}
                  contentPosition={selectedAccountBrand.iconPosition ?? 'center'}
                />
              ) : (
                <ThemedText style={styles.quickOptionIcon}>{selectedAccount?.icon ?? '▤'}</ThemedText>
              )}
            </View>
            <ThemedText style={styles.quickText} numberOfLines={1}>{selectedAccount?.name ?? '账户'}</ThemedText>
          </Pressable>
          <Pressable style={styles.quickOption}><ThemedText style={styles.quickOptionIcon}>🧾</ThemedText><ThemedText style={styles.quickText}>报销</ThemedText></Pressable>
          <Pressable
            onPress={() => {
              setTagPickerMounted(true);
              setShowTagPicker(true);
            }}
            style={[styles.quickOption, tagIds.length > 0 && styles.activeTagOption]}>
            <ThemedText style={[styles.quickOptionIcon, tagIds.length > 0 && styles.activeTagText]}>#</ThemedText>
            <ThemedText style={[styles.quickText, tagIds.length > 0 && styles.activeTagText]}>{tagIds.length > 0 ? `标签 ${tagIds.length}` : '标签'}</ThemedText>
          </Pressable>
          <Pressable style={styles.quickOption}><ThemedText style={styles.quickOptionIcon}>∅</ThemedText><ThemedText style={styles.quickText}>不计入</ThemedText></Pressable>
        </View> : null}

        <View style={styles.inputBar}>
          <TextInput
            value={note}
            onChangeText={setNote}
            onSubmitEditing={() => Keyboard.dismiss()}
            returnKeyType="done"
            blurOnSubmit
            maxLength={150}
            placeholder="添加备注…"
            placeholderTextColor="#A8A8AA"
            style={[styles.noteInput, { color: theme.text }]}
          />
          <Pressable onPress={openDatePicker} style={styles.datePill}><ThemedText style={styles.dateIcon}>▦</ThemedText><ThemedText style={styles.dateText}>{formatDateTime(occurredAt)}</ThemedText></Pressable>
          <Pressable
            onPress={() => {
              setActiveAmountField('amount');
              Keyboard.dismiss();
            }}
            style={styles.amountPreviewButton}>
            {type === 'transfer' ? (
              <ThemedText style={styles.amountFieldLabel}>
                {activeAmountField === 'adjustment'
                  ? transferAdjustmentMode === 'fee' ? '手续费' : '优惠'
                  : '转账金额'}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.amountPreview, { color: type === 'income' ? AppPalette.income : type === 'transfer' ? AppPalette.inkSoft : AppPalette.expense }]}>¥{type === 'transfer' && activeAmountField === 'adjustment' ? (transferAdjustment || '0.00') : (amount || '0.00')}</ThemedText>
          </Pressable>
        </View>
        {/* 键盘区始终保留在布局中，切换时只改 opacity + pointerEvents，
            不改布局尺寸 —— 挂载/卸载会导致 scroll 区突然扩缩，引起整屏跳闪。
            键盘出现时它被系统键盘盖住（iOS 叠层，Android 需 pan 模式），
            键盘退出后恢复可交互。*/}
        <View
          style={{ opacity: keypadVisible ? 1 : 0 }}
          pointerEvents={keypadVisible ? 'auto' : 'none'}>
          <TransactionKeypad
            disabled={isSubmitting}
            secondaryActionLabel={isEditing ? '取消' : '再记'}
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onSave={() => void handleSubmit()}
            onSaveAndContinue={() => {
              if (isEditing) {
                Keyboard.dismiss();
                router.back();
              } else {
                void handleSubmit(true);
              }
            }}
          />
        </View>
        <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerCard}>
              <ThemedText style={styles.pickerTitle}>选择日期和时间</ThemedText>
              <DateTimePicker value={occurredAt} mode={Platform.OS === 'ios' ? 'datetime' : pickerMode} display="spinner" onChange={handleDateChange} />
              <Pressable onPress={() => setShowDatePicker(false)} style={styles.pickerDone}><ThemedText style={styles.pickerDoneText}>完成</ThemedText></Pressable>
            </View>
          </View>
        </Modal>
        <AccountPickerSheet
          kind={accountPicker}
          displayKind={accountPickerContent}
          mounted={accountPickerMounted}
          accounts={accounts}
          sourceAccountId={effectiveAccountId}
          targetAccountId={effectiveTransferAccountId}
          transferMode={type === 'transfer'}
          onClose={closeAccountPicker}
          onClosed={handleAccountPickerClosed}
          onSelect={(pickerKind, nextAccountId) => {
            if (pickerKind === 'target') {
              setTransferAccountId(nextAccountId);
            } else {
              // 当前转入账户可能是 render 时推导出的备用值。
              // 先把它固化到 state，避免更换转出账户时转入账户跟着重新推导。
              if (type === 'transfer') setTransferAccountId(effectiveTransferAccountId);
              setAccountId(nextAccountId);
            }
            closeAccountPicker();
          }}
        />
        <TagPickerSheet
          visible={showTagPicker}
          mounted={tagPickerMounted}
          selectedTagIds={tagIds}
          onChange={setTagIds}
          onClose={() => setShowTagPicker(false)}
          onClosed={handleTagPickerClosed}
          onManage={() => {
            openTagManagerAfterCloseRef.current = true;
            setShowTagPicker(false);
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppPalette.surface },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  loadingText: { ...Type.body, color: '#71808C', fontWeight: FontWeight.medium },
  topPanel: { backgroundColor: 'rgba(255,255,255,0.42)', paddingHorizontal: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.66)' },
  header: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSideButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, lineHeight: 34, color: '#17212B', fontWeight: FontWeight.regular },
  typeBar: { flex: 1 },
  typeBarContent: { flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 },
  typeItem: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 16 },
  activeType: { backgroundColor: AppPalette.primary },
  typeText: { ...Type.body, fontWeight: FontWeight.semibold, color: '#71808C' },
  activeTypeText: { color: '#FFFFFF' },
  disabledTypeItem: { opacity: 0.45 },
  disabledType: { color: '#9AABB0' },
  settings: { ...Glyph.md, color: '#71808C' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 4 },
  quickOptions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, gap: 5 },
  // 药丸形带描边，参考图样式
  quickOption: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 15, backgroundColor: AppPalette.lineStrong },
  accountQuickOption: { maxWidth: 112, backgroundColor: AppPalette.cyanSoft },
  quickAccountIconBox: { width: 18, height: 18, borderRadius: 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  quickAccountIcon: { width: 17, height: 17, borderRadius: 8.5 },
  quickOptionIcon: { fontSize: 13, lineHeight: 16 },
  quickText: { ...Type.footnote, fontWeight: FontWeight.medium, color: '#3A4249' },
  activeTagOption: { backgroundColor: AppPalette.lavenderSoft },
  activeTagText: { color: AppPalette.primary },
  inputBar: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6, borderTopWidth: 1, borderColor: AppPalette.lineStrong, backgroundColor: 'rgba(255,255,255,0.84)' },
  noteInput: { flex: 1, minWidth: 70, ...Type.body, paddingVertical: 8, color: '#6E7772' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 7, borderRadius: 14, backgroundColor: '#F0F2F3' },
  dateIcon: { ...Glyph.sm, color: '#5A6B78' },
  dateText: { ...Type.footnote, ...Numeric, fontWeight: FontWeight.semibold },
  amountPreview: { ...Type.title, ...Numeric, fontWeight: FontWeight.bold, minWidth: 78, textAlign: 'right' },
  amountPreviewButton: { alignItems: 'flex-end', justifyContent: 'center' },
  amountFieldLabel: { ...Type.caption, color: '#8A9298', lineHeight: 13 },
  pickerBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: AppPalette.overlay },
  pickerCard: { borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  pickerTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  pickerDone: { alignSelf: 'stretch', alignItems: 'center', borderRadius: 12, paddingVertical: 11, backgroundColor: AppPalette.primary },
  pickerDoneText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
});
