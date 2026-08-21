import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { useTabScroll } from '@/context/tab-scroll';
import {
  consumeAiDraftSaves,
  subscribeToAiDraftSaves,
  type AiDraftSaveReceipt,
} from '@/features/ai/application/aiDraftSaveSignal';
import { recognizeBill, type AiLedgerContext } from '@/features/ai/data/aiLedgerApi';
import type { RecognizedBill } from '@/features/ai/domain/recognizedBill';
import { useTransactionFormData, useTransactionRepository } from '@/features/transactions/hooks/useTransactions';
import { createTransaction } from '@/features/transactions/application/createTransaction';
import type { TransactionDraft } from '@/features/transactions/domain/transaction.types';
import type { Category } from '@/features/categories/domain/category.types';
import type { AccountBalance } from '@/features/accounts/domain/account.types';
import { consumePendingQuickCapture } from '@/platform/quick-ai-capture';

type UploadedAsset = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'fileName' | 'width' | 'height'>;
type ResolvedBill = {
  draft: TransactionDraft;
  categoryLabel: string;
  accountLabel: string;
  occurredAtLabel: string;
  unresolvedFields: string[];
};
type ChatMessage =
  | { id: string; role: 'user'; kind: 'text'; text: string }
  | { id: string; role: 'user'; kind: 'image'; uri: string; fileName: string }
  | { id: string; role: 'assistant'; kind: 'text'; text: string; retry?: boolean }
  | { id: string; role: 'assistant'; kind: 'bill'; bill: RecognizedBill; status: 'pending' | 'superseded' | 'confirmed' };
type BillMessage = Extract<ChatMessage, { kind: 'bill' }>;

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s·・_\-—>＞/\\|:：]+/g, '');
}

function chooseCategory(bill: RecognizedBill, categories: Category[]) {
  const requestedParent = bill.parentCategoryName ? normalize(bill.parentCategoryName) : '';
  const requestedCategory = bill.categoryName ? normalize(bill.categoryName) : '';
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const candidates = categories
    .filter((category) => category.parentId !== null)
    .map((category) => {
      const parent = categoryById.get(category.parentId!);
      return {
        category,
        parent,
        normalizedParentName: parent ? normalize(parent.name) : '',
        normalizedName: normalize(category.name),
        isFallback: parent ? normalize(parent.name) === normalize(category.name) : false,
      };
    });
  const exactPair = requestedParent && requestedCategory
    ? candidates.find((candidate) => (
        candidate.normalizedParentName === requestedParent
        && candidate.normalizedName === requestedCategory
      ))
    : undefined;
  const exactNameCandidates = requestedCategory
    ? candidates.filter((candidate) => candidate.normalizedName === requestedCategory)
    : [];
  const uniqueName = exactNameCandidates.length === 1 ? exactNameCandidates[0] : undefined;
  const partial = requestedCategory && exactNameCandidates.length === 0
    ? candidates
        .filter((candidate) => (
          (!requestedParent || candidate.normalizedParentName === requestedParent)
          && (requestedCategory.includes(candidate.normalizedName) || candidate.normalizedName.includes(requestedCategory))
        ))
        .sort((left, right) => {
          const fallbackOrder = Number(left.isFallback) - Number(right.isFallback);
          return fallbackOrder || right.normalizedName.length - left.normalizedName.length;
        })[0]
    : undefined;
  const parentFallback = requestedParent
    ? candidates.find((candidate) => candidate.normalizedParentName === requestedParent && candidate.isFallback)
    : undefined;
  const match = exactPair ?? (!requestedParent ? uniqueName : undefined) ?? partial;
  const ambiguousName = exactNameCandidates.length > 1 ? exactNameCandidates[0] : undefined;
  const fallbackId = bill.type === 'income' ? 'salary-default' : 'expense-dining-default';
  const selected = match ?? uniqueName ?? parentFallback ?? ambiguousName;
  const category = selected?.category
    ?? categories.find((item) => item.id === fallbackId) ?? candidates[0]?.category ?? categories[0];
  const parent = selected?.parent ?? (category?.parentId ? categoryById.get(category.parentId) : undefined);
  const label = parent && normalize(parent.name) !== normalize(category.name)
    ? `${parent.name}--${category.name}`
    : category?.name ?? '';
  return { category, label, matched: Boolean(match) };
}

function chooseAccount(bill: RecognizedBill, accounts: AccountBalance[]) {
  const requested = bill.paymentMethod ? normalize(bill.paymentMethod) : '';
  const exact = accounts.find((account) => normalize(account.name) === requested);
  const partial = requested
    ? accounts.find((account) => requested.includes(normalize(account.name)) || normalize(account.name).includes(requested))
    : undefined;
  return { account: exact ?? partial ?? accounts[0], matched: Boolean(exact || partial) };
}

function noteForBill(bill: RecognizedBill) {
  const note = bill.note?.trim();
  if (!note) return bill.merchant ?? '';

  const yuan = bill.amountCents / 100;
  const amountVariants = [...new Set([yuan.toFixed(2), String(yuan)])]
    .map((value) => value.replace('.', '\\.'))
    .join('|');
  const monetaryAmount = new RegExp(`(?:[¥￥]\\s*(?:${amountVariants})|(?:${amountVariants})\\s*(?:元|块(?:钱)?))`, 'gi');
  const withoutAmount = note
    .replace(monetaryAmount, '')
    .replace(/(?:消费金额|付款金额|支付金额|实付金额|合计|共计|消费|花费|付款|支付|实付|金额|价格)\s*[:：]?\s*$/g, '')
    .replace(/[\s，,。；;：:\-—]+$/g, '')
    .trim();
  const plainAmount = note.replace(/[¥￥\s,，]/g, '').replace(/(?:人民币|元|块钱?|rmb|cny)$/i, '');
  const isOnlyAmount = Number.isFinite(Number(plainAmount))
    && Math.round(Number(plainAmount) * 100) === bill.amountCents;
  return isOnlyAmount || !withoutAmount ? bill.merchant ?? '' : withoutAmount;
}

function resolveBill(bill: RecognizedBill, categories: Category[], accounts: AccountBalance[]): ResolvedBill | null {
  const categoryResult = chooseCategory(bill, categories);
  const accountResult = chooseAccount(bill, accounts);
  if (!categoryResult.category || !accountResult.account) return null;
  const parsedDate = bill.occurredAt ? new Date(bill.occurredAt) : null;
  const occurredAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  const unresolvedFields = [...bill.uncertainFields];
  if (!categoryResult.matched) unresolvedFields.push('category');
  if (!accountResult.matched) unresolvedFields.push('paymentMethod');
  if (!bill.occurredAt) unresolvedFields.push('occurredAt');
  return {
    draft: {
      type: bill.type,
      amountCents: bill.amountCents,
      categoryId: categoryResult.category.id,
      accountId: accountResult.account.id,
      occurredAt: occurredAt.toISOString(),
      note: noteForBill(bill),
    },
    categoryLabel: categoryResult.label,
    accountLabel: accountResult.account.name,
    occurredAtLabel: occurredAt.toLocaleString('zh-CN', { hour12: false }),
    unresolvedFields: [...new Set(unresolvedFields)],
  };
}

function createAiLedgerContext(categories: Category[], accounts: AccountBalance[]): AiLedgerContext {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return {
    categories: categories.map((category) => ({
      type: category.type,
      name: category.name,
      parentName: category.parentId ? categoryNames.get(category.parentId) ?? null : null,
    })),
    accounts: accounts.map((account) => account.name),
  };
}

async function toDataUrl(asset: UploadedAsset) {
  const longestSide = Math.max(asset.width ?? 0, asset.height ?? 0);
  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  if (longestSide > 1600) {
    const scale = 1600 / longestSide;
    context.resize({ width: Math.round((asset.width ?? 1600) * scale), height: Math.round((asset.height ?? 1600) * scale) });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ base64: true, compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
  if (!result.base64) throw new Error('图片压缩失败，请重试');
  return `data:image/jpeg;base64,${result.base64}`;
}

function fieldLabel(field: string) {
  return ({ amount: '金额', category: '分类', paymentMethod: '账户', occurredAt: '时间', merchant: '商户' } as Record<string, string>)[field] ?? field;
}

function BillReceiptCard({
  message,
  resolved,
  isAnalyzing,
  onEdit,
  onConfirm,
}: {
  message: BillMessage;
  resolved: ResolvedBill | null;
  isAnalyzing: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const { bill, status } = message;
  const isIncome = bill.type === 'income';
  const blocked = !resolved || resolved.unresolvedFields.includes('amount');
  const statusLabel = status === 'confirmed' ? '已保存' : status === 'superseded' ? '历史草稿' : '待确认';
  const merchant = bill.merchant?.trim() || (isIncome ? '收入记录' : '消费记录');
  const storedNote = resolved?.draft.note.trim();
  const itemLabel = storedNote && storedNote !== bill.merchant ? storedNote : bill.summary;
  const amount = `¥${(bill.amountCents / 100).toFixed(2)}`;
  const accentColor = isIncome ? AppPalette.income : AppPalette.expense;

  return (
    <View style={styles.receiptCard}>
      <View style={[styles.receiptAccent, { backgroundColor: accentColor }]} />
      <View style={styles.receiptBody}>
        <View style={styles.receiptTopLine}>
          <ThemedText style={styles.receiptEyebrow}>{isIncome ? 'AI 收入单' : 'AI 消费单'}</ThemedText>
          <View style={[
            styles.receiptStatus,
            status === 'confirmed' && styles.receiptStatusConfirmed,
            status === 'superseded' && styles.receiptStatusMuted,
          ]}>
            <ThemedText style={[
              styles.receiptStatusText,
              status === 'confirmed' && styles.receiptStatusTextConfirmed,
              status === 'superseded' && styles.receiptStatusTextMuted,
            ]}>{statusLabel}</ThemedText>
          </View>
        </View>

        <View style={styles.receiptHeading}>
          <ThemedText style={styles.receiptMerchant} numberOfLines={1}>{merchant}</ThemedText>
        </View>

        {resolved ? (
          <>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptMeta}>
              <View style={styles.receiptMetaRow}>
                <ThemedText style={styles.receiptMetaLabel}>分类</ThemedText>
                <ThemedText style={styles.receiptMetaValue} numberOfLines={1}>{resolved.categoryLabel}</ThemedText>
              </View>
              <View style={styles.receiptMetaRow}>
                <ThemedText style={styles.receiptMetaLabel}>账户</ThemedText>
                <ThemedText style={styles.receiptMetaValue} numberOfLines={1}>{resolved.accountLabel}</ThemedText>
              </View>
              <View style={styles.receiptMetaRow}>
                <ThemedText style={styles.receiptMetaLabel}>时间</ThemedText>
                <ThemedText style={styles.receiptMetaValue} numberOfLines={1}>{resolved.occurredAtLabel}</ThemedText>
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.receiptDivider} />

        <View style={styles.receiptItemHeader}>
          <ThemedText style={styles.receiptColumnLabel}>消费项目</ThemedText>
          <ThemedText style={styles.receiptColumnLabel}>小计</ThemedText>
        </View>
        <View style={styles.receiptItemRow}>
          <ThemedText style={styles.receiptItemName} numberOfLines={2}>{itemLabel}</ThemedText>
          <ThemedText style={styles.receiptItemAmount}>{amount}</ThemedText>
        </View>

        <View style={styles.receiptTotalRow}>
          <ThemedText style={styles.receiptTotalLabel}>{isIncome ? '收入合计' : '消费合计'}</ThemedText>
          <ThemedText style={[styles.receiptTotalAmount, { color: accentColor }]}>{amount}</ThemedText>
        </View>

        {resolved && resolved.unresolvedFields.length > 0 ? (
          <View style={styles.receiptWarning}>
            <ThemedText style={styles.receiptWarningIcon}>!</ThemedText>
            <ThemedText style={styles.uncertainText}>需要确认：{resolved.unresolvedFields.map(fieldLabel).join('、')}</ThemedText>
          </View>
        ) : null}

        {status === 'pending' ? (
          <View style={styles.billActions}>
            <Pressable onPress={onEdit} style={styles.editButton}>
              <ThemedText style={styles.editButtonText}>修改账单</ThemedText>
            </Pressable>
            <Pressable
              disabled={blocked || isAnalyzing}
              onPress={onConfirm}
              style={[styles.confirmButton, blocked && styles.disabledButton]}>
              <ThemedText style={styles.confirmButtonText}>{blocked ? '先确认金额' : '确认写入'}</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.receiptSavedLine}>
            <ThemedText style={[
              styles.receiptSavedText,
              status === 'confirmed' && styles.receiptSavedTextConfirmed,
            ]}>{status === 'confirmed' ? '✓ 该账单已写入' : '此草稿已被新结果替代'}</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

export function AiLedgerScreen() {
  const router = useRouter();
  const captureParams = useLocalSearchParams<{
    quickCaptureToken?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const tabScroll = useTabScroll();
  const scrollRef = useRef<ScrollView | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const imageDataRef = useRef<{ uri: string; dataUrl: string } | null>(null);
  const queuedAssetRef = useRef<ImagePicker.ImagePickerAsset | null>(null);
  const handledQuickCaptureTokenRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [latestAsset, setLatestAsset] = useState<UploadedAsset | null>(null);
  const [activeBill, setActiveBill] = useState<RecognizedBill | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const repository = useTransactionRepository();
  const expenseFormData = useTransactionFormData('expense');
  const incomeFormData = useTransactionFormData('income');
  const localContextReady = expenseFormData.accounts.length > 0
    && expenseFormData.categories.length > 0
    && incomeFormData.categories.length > 0;

  // 键盘监听：显示时隐藏 Tab 栏
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showListener = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      tabScroll?.hideTabBar();
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      tabScroll?.showTabBar();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
      tabScroll?.showTabBar();
    };
  }, [tabScroll]);

  const acknowledgeSavedDrafts = useCallback((receipts: AiDraftSaveReceipt[]) => {
    if (receipts.length === 0) return;
    const savedMessageIds = new Set(receipts.map((receipt) => receipt.messageId));
    setMessages((current) => current.map((message) => (
      message.kind === 'bill' && savedMessageIds.has(message.id)
        ? { ...message, status: 'confirmed' }
        : message
    )));
    setActiveBill(null);
    setLatestAsset(null);
    imageDataRef.current = null;
  }, []);

  useEffect(() => subscribeToAiDraftSaves((receipt) => acknowledgeSavedDrafts([receipt])), [acknowledgeSavedDrafts]);

  useFocusEffect(useCallback(() => {
    acknowledgeSavedDrafts(consumeAiDraftSaves());
  }, [acknowledgeSavedDrafts]));

  const analyzeImage = useCallback(async (asset: UploadedAsset, instruction: string, currentBill: RecognizedBill | null) => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const pendingId = createMessageId('assistant');
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 45000);
    setIsAnalyzing(true);
    setMessages((current) => [...current, { id: pendingId, role: 'assistant', kind: 'text', text: '正在读取图片并整理账单…' }]);
    try {
      const accounts = expenseFormData.accounts.length > 0 ? expenseFormData.accounts : incomeFormData.accounts;
      const context = createAiLedgerContext([...expenseFormData.categories, ...incomeFormData.categories], accounts);
      const imageDataUrl = imageDataRef.current?.uri === asset.uri
        ? imageDataRef.current.dataUrl
        : await toDataUrl(asset);
      imageDataRef.current = { uri: asset.uri, dataUrl: imageDataUrl };
      const bill = await recognizeBill({ imageDataUrl, instruction, context, currentBill: currentBill ?? undefined }, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setActiveBill(bill);
      setMessages((current) => current.map((message) => {
        if (message.id === pendingId) return { id: pendingId, role: 'assistant', kind: 'bill', bill, status: 'pending' };
        if (message.kind === 'bill' && message.status === 'pending') return { ...message, status: 'superseded' };
        return message;
      }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (controller.signal.aborted && !timedOut) return;
      const errorMessage = timedOut ? '识别超时，请检查网络后重试' : error instanceof Error ? error.message : '请稍后重试';
      setMessages((current) => current.map((message) => message.id === pendingId
        ? { id: pendingId, role: 'assistant', kind: 'text', text: `识别失败：${errorMessage}。可以重新选择图片再试。`, retry: true }
        : message));
    } finally {
      clearTimeout(timeout);
      if (requestId === requestIdRef.current) setIsAnalyzing(false);
    }
  }, [expenseFormData.accounts, expenseFormData.categories, incomeFormData.accounts, incomeFormData.categories]);

  const startImageAnalysis = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!localContextReady) {
      queuedAssetRef.current = asset;
      setMessages((current) => [...current, {
        id: createMessageId('assistant'),
        role: 'assistant',
        kind: 'text',
        text: '正在准备本地分类和账户，图片会在准备好后自动识别…',
      }]);
      return;
    }
    const uploaded: UploadedAsset = { uri: asset.uri, fileName: asset.fileName, width: asset.width, height: asset.height };
    imageDataRef.current = null;
    setActiveBill(null);
    setLatestAsset(uploaded);
    setMessages((current) => [
      ...current.map((message) => message.kind === 'bill' && message.status === 'pending'
        ? { ...message, status: 'superseded' as const }
        : message),
      { id: createMessageId('image'), role: 'user', kind: 'image', uri: uploaded.uri, fileName: uploaded.fileName?.trim() || '账单图片' },
    ]);
    void analyzeImage(uploaded, '', null);
  }, [analyzeImage, localContextReady]);

  const appendSelectedImage = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!activeBill) { startImageAnalysis(asset); return; }
    Alert.alert('当前账单尚未确认', '上传新图片会结束当前草稿，是否继续？', [
      { text: '取消', style: 'cancel' },
      { text: '开始新账单', onPress: () => startImageAnalysis(asset) },
    ]);
  }, [activeBill, startImageAnalysis]);

  useEffect(() => {
    const captureToken = Array.isArray(captureParams.quickCaptureToken)
      ? captureParams.quickCaptureToken[0]
      : captureParams.quickCaptureToken;
    if (Platform.OS !== 'android' || !captureToken || handledQuickCaptureTokenRef.current === captureToken) return;
    handledQuickCaptureTokenRef.current = captureToken;
    let active = true;
    void consumePendingQuickCapture(captureToken)
      .then((capture) => {
        if (!active) return;
        if (!capture) {
          Alert.alert('快捷截屏已失效', '请从下拉栏重新点击“AI 记账”进行截屏。');
          return;
        }
        appendSelectedImage({
          uri: capture.uri,
          fileName: `快捷截屏-${Date.now()}.png`,
          width: capture.width,
          height: capture.height,
          mimeType: 'image/png',
        });
      })
      .catch(() => {
        if (active) Alert.alert('无法读取快捷截屏', '请从下拉栏重新截屏。');
      })
      .finally(() => {
        if (active) router.setParams({ quickCaptureToken: undefined });
      });
    return () => { active = false; };
  }, [appendSelectedImage, captureParams.quickCaptureToken, router]);

  useEffect(() => {
    const queuedAsset = queuedAssetRef.current;
    if (!queuedAsset || !localContextReady || activeBill) return;
    queuedAssetRef.current = null;
    startImageAnalysis(queuedAsset);
  }, [activeBill, localContextReady, startImageAnalysis]);

  useEffect(() => {
    void ImagePicker.getPendingResultAsync().then((result) => {
      if (result && 'canceled' in result && !result.canceled) appendSelectedImage(result.assets[0]);
    });
    return () => abortRef.current?.abort();
  }, [appendSelectedImage]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  async function selectFromLibrary() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
      if (!result.canceled) appendSelectedImage(result.assets[0]);
    } catch (error) { Alert.alert('无法选择图片', error instanceof Error ? error.message : '请稍后重试'); }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { Alert.alert('需要相机权限', '请在系统设置中允许使用相机，才能拍摄账单图片。'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85, cameraType: ImagePicker.CameraType.back });
      if (!result.canceled) appendSelectedImage(result.assets[0]);
    } catch (error) { Alert.alert('无法打开相机', error instanceof Error ? error.message : '请稍后重试'); }
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((current) => [...current, { id: createMessageId('user'), role: 'user', kind: 'text', text }]);
    if (latestAsset) void analyzeImage(latestAsset, text, activeBill);
    else setMessages((current) => [...current, { id: createMessageId('assistant'), role: 'assistant', kind: 'text', text: '请先上传一张小票或支付截图，我再帮你识别。' }]);
  }

  function resolvedFor(bill: RecognizedBill) {
    const categories = bill.type === 'income' ? incomeFormData.categories : expenseFormData.categories;
    const accounts = expenseFormData.accounts.length > 0 ? expenseFormData.accounts : incomeFormData.accounts;
    return resolveBill(bill, categories, accounts);
  }

  async function confirmBill(messageId: string, bill: RecognizedBill) {
    const resolved = resolvedFor(bill);
    if (!resolved) { Alert.alert('暂时无法入账', '本地分类或账户还没有准备好，请稍后重试。'); return; }
    if (resolved.unresolvedFields.includes('amount')) { Alert.alert('金额需要确认', '图片中的金额不够清晰，请点击“修改”后手动确认。'); return; }
    try {
      await createTransaction(repository, resolved.draft);
      setActiveBill(null);
      setLatestAsset(null);
      imageDataRef.current = null;
      setMessages((current) => current.map((message) => {
        if (message.id === messageId && message.kind === 'bill') return { ...message, status: 'confirmed' };
        if (message.kind === 'bill' && message.status === 'pending') return { ...message, status: 'superseded' };
        return message;
      }));
    } catch (error) { Alert.alert('写入失败', error instanceof Error ? error.message : '请稍后重试'); }
  }

  function editBill(messageId: string, bill: RecognizedBill) {
    const resolved = resolvedFor(bill);
    if (!resolved) { Alert.alert('暂时无法修改', '本地分类或账户还没有准备好，请稍后重试。'); return; }
    router.push({ pathname: '/transaction/create', params: {
      draftType: resolved.draft.type,
      draftAmountCents: String(resolved.draft.amountCents),
      draftCategoryId: resolved.draft.categoryId,
      draftAccountId: resolved.draft.accountId,
      draftOccurredAt: resolved.draft.occurredAt,
      draftNote: resolved.draft.note,
      aiDraftMessageId: messageId,
    } });
  }

  return (
    <ThemedView style={styles.container}>
      <AppBackground />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.keyboardView, { paddingBottom: keyboardVisible ? 0 : Math.max(insets.bottom, 10) }]}
        >
          <View style={styles.header}>
            <View style={styles.assistantAvatar}><SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={21} tintColor="#FFFFFF" /></View>
            <View style={styles.headerCopy}><View style={styles.titleRow}><ThemedText style={styles.title}>AI 图片记账</ThemedText><View style={styles.betaBadge}><ThemedText style={styles.betaText}>内测</ThemedText></View></View><ThemedText type="small" themeColor="textSecondary">小票、订单和支付截图都可以发给我</ThemedText></View>
          </View>
          <ScrollView ref={scrollRef} style={styles.conversation} contentContainerStyle={styles.conversationContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.assistantRow}><View style={styles.miniAvatar}><ThemedText style={styles.miniAvatarText}>✦</ThemedText></View><View style={styles.assistantBubble}><ThemedText style={styles.messageText}>把账单图片发给我吧。我会识别金额、分类、账户和时间，再交给你确认。</ThemedText><View style={styles.safetyNote}><ThemedText style={styles.safetyIcon}>✓</ThemedText><ThemedText style={styles.safetyText}>识别结果不会自动入账</ThemedText></View></View></View>
            {messages.length === 0 ? <View style={styles.guideCard}><View style={styles.guideTitleRow}><ThemedText style={styles.guideIcon}>▣</ThemedText><ThemedText style={styles.guideTitle}>识别结果会这样返回</ThemedText></View><View style={styles.previewBill}><View><ThemedText type="small" themeColor="textSecondary">待确认账单</ThemedText><ThemedText style={styles.previewFields}>金额 · 分类 · 账户 · 时间</ThemedText></View><View style={styles.previewActions}><ThemedText style={styles.previewEdit}>修改</ThemedText><ThemedText style={styles.previewConfirm}>确认写入</ThemedText></View></View><ThemedText style={styles.guideHint}>“修改”会打开完整的标准记账页面。</ThemedText></View> : null}
            {messages.map((message) => {
              if (message.role === 'user') {
                return (
                  <View key={message.id} style={styles.userRow}>
                    <View style={styles.userBubble}>
                      {message.kind === 'image' ? (
                        <>
                          <Image source={{ uri: message.uri }} style={styles.uploadedImage} contentFit="cover" />
                          <ThemedText style={styles.imageName} numberOfLines={1}>{message.fileName}</ThemedText>
                        </>
                      ) : <ThemedText style={styles.userMessageText}>{message.text}</ThemedText>}
                    </View>
                  </View>
                );
              }
              if (message.kind === 'bill') {
                return (
                  <View key={message.id} style={[styles.assistantRow, styles.billMessageRow]}>
                    <View style={styles.miniAvatar}><ThemedText style={styles.miniAvatarText}>✦</ThemedText></View>
                    <BillReceiptCard
                      message={message}
                      resolved={resolvedFor(message.bill)}
                      isAnalyzing={isAnalyzing}
                      onEdit={() => editBill(message.id, message.bill)}
                      onConfirm={() => void confirmBill(message.id, message.bill)}
                    />
                  </View>
                );
              }
              return (
                <View key={message.id} style={styles.assistantRow}>
                  <View style={styles.miniAvatar}><ThemedText style={styles.miniAvatarText}>✦</ThemedText></View>
                  <View style={styles.assistantBubble}><ThemedText style={styles.messageText}>{message.text}</ThemedText></View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.composerWrap}><View style={styles.suggestionRow}><Pressable onPress={() => void takePhoto()} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}><SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={16} tintColor={AppPalette.inkSoft} /><ThemedText style={styles.suggestionText}>拍小票</ThemedText></Pressable><Pressable onPress={() => void selectFromLibrary()} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}><SymbolView name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }} size={16} tintColor={AppPalette.inkSoft} /><ThemedText style={styles.suggestionText}>选截图</ThemedText></Pressable></View><View style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="从相册选择图片" onPress={() => void selectFromLibrary()} style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}><ThemedText style={styles.attachText}>＋</ThemedText></Pressable><TextInput value={input} onChangeText={setInput} onSubmitEditing={sendMessage} returnKeyType="send" placeholder={activeBill ? '继续修改当前账单…' : '上传图片或补充说明…'} placeholderTextColor={AppPalette.textFaint} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="发送说明" disabled={!input.trim() || isAnalyzing} onPress={sendMessage} style={({ pressed }) => [styles.sendButton, (!input.trim() || isAnalyzing) && styles.sendButtonDisabled, pressed && styles.pressed]}><ThemedText style={styles.sendText}>↑</ThemedText></Pressable></View><ThemedText style={styles.privacyText}>{activeBill ? '本轮会基于当前草稿增量修改' : '图片会发送到 AI 服务，仅用于生成待确认账单'}</ThemedText></View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 }, keyboardView: { flex: 1 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.72)' },
  assistantAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C97594', shadowColor: '#A65476', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  headerCopy: { flex: 1, gap: 1 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, title: { ...Type.headline, fontWeight: FontWeight.bold }, betaBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: AppPalette.blush }, betaText: { ...Type.caption, color: '#B45F7E', fontWeight: FontWeight.semibold },
  conversation: { flex: 1 }, conversationContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12, gap: 14 }, assistantRow: { maxWidth: '94%', flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, miniAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C97594' }, miniAvatarText: { ...Glyph.sm, color: '#FFFFFF', fontWeight: FontWeight.bold }, assistantBubble: { flexShrink: 1, borderRadius: 17, borderTopLeftRadius: 6, paddingHorizontal: 13, paddingVertical: 10, gap: 9, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)' }, messageText: { ...Type.body, color: '#353A40' }, safetyNote: { flexDirection: 'row', alignItems: 'center', gap: 5 }, safetyIcon: { ...Type.caption, color: AppPalette.income, fontWeight: FontWeight.bold }, safetyText: { ...Type.footnote, color: AppPalette.textMuted, fontWeight: FontWeight.medium },
  guideCard: { marginLeft: 35, borderRadius: 18, padding: 12, gap: 9, backgroundColor: 'rgba(255,255,255,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.86)' }, guideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, guideIcon: { ...Glyph.sm, color: '#B96787' }, guideTitle: { ...Type.subhead, fontWeight: FontWeight.semibold }, previewBill: { borderRadius: 14, padding: 11, gap: 10, backgroundColor: AppPalette.surface, borderWidth: 1, borderColor: AppPalette.line }, previewFields: { ...Type.body, ...Numeric, marginTop: 2, color: AppPalette.inkSoft, fontWeight: FontWeight.semibold }, previewActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }, previewEdit: { ...Type.footnote, color: AppPalette.inkSoft, fontWeight: FontWeight.semibold }, previewConfirm: { ...Type.footnote, color: '#B45F7E', fontWeight: FontWeight.semibold }, guideHint: { ...Type.footnote, color: AppPalette.textMuted },
  userRow: { alignItems: 'flex-end' }, userBubble: { maxWidth: '80%', overflow: 'hidden', borderRadius: 17, borderTopRightRadius: 6, padding: 4, backgroundColor: '#F3DDE6' }, userMessageText: { ...Type.body, color: '#432D36', paddingHorizontal: 9, paddingVertical: 6 }, uploadedImage: { width: 190, height: 150, borderRadius: 14, backgroundColor: AppPalette.surfaceMuted }, imageName: { maxWidth: 190, ...Type.caption, color: '#725260', paddingHorizontal: 7, paddingVertical: 5 },
  billMessageRow: { alignSelf: 'stretch', maxWidth: '100%' },
  receiptCard: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E7DED1', shadowColor: '#6D5845', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  receiptAccent: { height: 6 },
  receiptBody: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 13, gap: 11 },
  receiptTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  receiptEyebrow: { ...Type.footnote, color: '#786A5D', fontWeight: FontWeight.bold, letterSpacing: 1.1 },
  receiptStatus: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: AppPalette.warningSoft },
  receiptStatusConfirmed: { backgroundColor: AppPalette.incomeSoft },
  receiptStatusMuted: { backgroundColor: AppPalette.surfaceMuted },
  receiptStatusText: { ...Type.caption, color: '#A36B1D', fontWeight: FontWeight.bold },
  receiptStatusTextConfirmed: { color: '#23885D' },
  receiptStatusTextMuted: { color: AppPalette.textMuted },
  receiptHeading: { alignItems: 'center', paddingVertical: 3 },
  receiptMerchant: { ...Type.title, color: '#2E2924', fontWeight: FontWeight.bold, textAlign: 'center' },
  receiptDivider: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#CFC3B5' },
  receiptMeta: { gap: 7 },
  receiptMetaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptMetaLabel: { width: 34, ...Type.footnote, color: '#9A8C7F' },
  receiptMetaValue: { flex: 1, minWidth: 0, ...Type.footnote, color: '#4C443D', textAlign: 'right', fontWeight: FontWeight.medium },
  receiptItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptColumnLabel: { ...Type.caption, color: '#9A8C7F', fontWeight: FontWeight.semibold },
  receiptItemRow: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  receiptItemName: { flex: 1, minWidth: 0, ...Type.body, color: '#3F3832', fontWeight: FontWeight.semibold },
  receiptItemAmount: { ...Type.body, ...Numeric, color: '#3F3832', fontWeight: FontWeight.semibold },
  receiptTotalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#EEE6DB' },
  receiptTotalLabel: { ...Type.subhead, color: '#6F6358', fontWeight: FontWeight.semibold },
  receiptTotalAmount: { ...Type.display, ...Numeric, fontWeight: FontWeight.bold },
  receiptWarning: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: AppPalette.warningSoft },
  receiptWarningIcon: { width: 18, height: 18, borderRadius: 9, ...Type.caption, lineHeight: 18, color: '#FFFFFF', backgroundColor: AppPalette.warning, textAlign: 'center', fontWeight: FontWeight.bold },
  uncertainText: { flex: 1, ...Type.footnote, color: '#A86D28', fontWeight: FontWeight.semibold },
  billActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 1 },
  editButton: { flex: 1, alignItems: 'center', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#F3EEE7' },
  editButtonText: { ...Type.footnote, color: '#62574D', fontWeight: FontWeight.semibold },
  confirmButton: { flex: 1, alignItems: 'center', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: AppPalette.primary },
  confirmButtonText: { ...Type.footnote, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  disabledButton: { backgroundColor: AppPalette.lineStrong },
  receiptSavedLine: { alignItems: 'center', paddingTop: 2 },
  receiptSavedText: { ...Type.footnote, color: AppPalette.textMuted, fontWeight: FontWeight.semibold },
  receiptSavedTextConfirmed: { color: '#23885D' },
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: AppPalette.line,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppPalette.surfaceMuted,
    borderWidth: 1,
    borderColor: AppPalette.line,
  },
  suggestionText: {
    ...Type.footnote,
    color: AppPalette.inkSoft,
    fontWeight: FontWeight.medium,
  },
  composer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 8,
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.lineStrong,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.surfaceMuted,
  },
  attachText: {
    ...Glyph.md,
    lineHeight: 23,
    color: AppPalette.inkSoft,
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...Type.body,
    color: AppPalette.ink,
    paddingVertical: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.primary,
  },
  sendButtonDisabled: {
    backgroundColor: AppPalette.lineStrong,
  },
  sendText: {
    ...Glyph.md,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  privacyText: {
    ...Type.caption,
    color: AppPalette.textFaint,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.97 }],
  },
});
