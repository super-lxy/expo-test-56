import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Type } from '@/constants/theme';
import { parseAmountToCents } from '@/shared/utils/currency';
import { createAccount } from '../application/createAccount';
import { findBrandAssets } from '../domain/account.brands';
import { findTemplate } from '../domain/account.templates';
import type { AccountStatus } from '../domain/account.types';
import { useAccountRepository } from '../hooks/useAccountRepository';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function parseDayInput(value: string): number | null {
  const n = parseInt(value, 10);
  if (!value.trim() || isNaN(n)) return null;
  return Math.min(31, Math.max(1, n));
}

// ─── 日期格栅选择器 ───────────────────────────────────────────────────────────

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function DayPickerModal({
  visible,
  selected,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  selected: number;
  onClose: () => void;
  onConfirm: (day: number) => void;
}) {
  const [temp, setTemp] = useState(selected);

  // selected 变化时同步 temp（每次打开）
  const handleOpen = () => setTemp(selected);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleOpen}
      onRequestClose={onClose}>
      <Pressable style={pk.overlay} onPress={onClose}>
        {/* 阻止冒泡，内容区点击不关闭 */}
        <Pressable style={pk.sheet} onPress={() => {}}>
          {/* 标题栏 */}
          <View style={pk.header}>
            <Pressable onPress={onClose} style={pk.closeBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="关闭">
              <ThemedText style={pk.closeIcon}>✕</ThemedText>
            </Pressable>
            <ThemedText style={pk.headerTitle}>选择日期</ThemedText>
            <View style={pk.headerSpacer} />
          </View>

          {/* 日期格栅 */}
          <View style={pk.grid}>
            {DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => setTemp(day)}
                style={[pk.cell, temp === day && pk.cellActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: temp === day }}>
                <ThemedText style={[pk.cellText, temp === day && pk.cellTextActive]}>
                  {day}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* 底部按钮 */}
          <View style={pk.footer}>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <ThemedText style={pk.cancelText}>取消</ThemedText>
            </Pressable>
            <Pressable onPress={() => onConfirm(temp)} style={pk.confirmBtn} accessibilityRole="button">
              <ThemedText style={pk.confirmText}>确定</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 8 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F2F4', alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 14, color: '#71808C', lineHeight: 18 },
  headerTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  headerSpacer: { width: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8 },
  // 每格占 1/7，内部居中
  cell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  cellActive: { backgroundColor: '#3DC06B', borderRadius: 999 },
  cellText: { ...Type.body, color: '#17212B' },
  cellTextActive: { color: '#FFFFFF', fontWeight: FontWeight.semibold },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, paddingTop: 12 },
  cancelText: { ...Type.body, color: '#71808C' },
  confirmBtn: { backgroundColor: '#3DC06B', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  confirmText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
});

// ─── 状态分段选择器 ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { key: AccountStatus; label: string }[] = [
  { key: 'active', label: '使用中' },
  { key: 'hidden', label: '隐藏' },
  { key: 'frozen', label: '封存' },
];

function StatusSegment({
  value,
  onChange,
  compact = false,
}: {
  value: AccountStatus;
  onChange: (v: AccountStatus) => void;
  compact?: boolean;
}) {
  return (
    <View style={[seg.wrap, compact && seg.compactWrap]}>
      {STATUS_OPTIONS.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={[
            seg.item,
            compact && seg.compactItem,
            value === opt.key && seg.itemActive,
            compact && value === opt.key && seg.compactItemActive,
          ]}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === opt.key }}>
          <ThemedText
            style={[
              seg.text,
              value === opt.key && seg.textActive,
              compact && value === opt.key && seg.compactTextActive,
            ]}>
            {opt.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const seg = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  item: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F2F4' },
  itemActive: { backgroundColor: '#E5F7EE' },
  text: { ...Type.subhead, fontWeight: FontWeight.medium, color: '#71808C' },
  textActive: { color: '#27A157', fontWeight: FontWeight.semibold },
  compactWrap: { width: 158, justifyContent: 'center', gap: 6 },
  compactItem: { width: 76, alignItems: 'center', paddingHorizontal: 7, paddingVertical: 6 },
  compactItemActive: { backgroundColor: '#A9DDB4' },
  compactTextActive: { color: '#FFFFFF' },
});

// ─── 主屏 ─────────────────────────────────────────────────────────────────────

export function AccountFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string; accountId?: string }>();
  const repository = useAccountRepository();
  const accountId = typeof params.accountId === 'string' ? params.accountId : null;
  const isEditing = accountId !== null;
  const template =
    findTemplate(typeof params.templateId === 'string' ? params.templateId : 'cash') ??
    findTemplate('cash')!;

  const hasBillingCycle = template.hasBillingCycle ?? false;
  const isSimpleAccount = !hasBillingCycle;
  const [name, setName] = useState('');
  const [currentDebt, setCurrentDebt] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [statementDay, setStatementDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [syncLedger, setSyncLedger] = useState(true);
  const [syncExpanded, setSyncExpanded] = useState(false);
  const [status, setStatus] = useState<AccountStatus>('active');
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    void repository.listWithBalances().then((accounts) => {
      if (cancelled) return;
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        Alert.alert('账户不存在', '这个账户可能已经被删除。');
        router.back();
        return;
      }
      setName(account.name);
      setCurrentDebt(((account.kind === 'liability' ? Math.abs(account.balanceCents) : account.balanceCents) / 100).toFixed(2));
      setCreditLimit(account.creditLimitCents !== null ? (account.creditLimitCents / 100).toFixed(2) : '');
      setStatementDay(account.statementDay !== null ? String(account.statementDay) : '');
      setDueDay(account.dueDay !== null ? String(account.dueDay) : '');
      setStatus(account.status);
      setIncludeInNetWorth(account.includeInNetWorth);
    }).catch((error) => {
      if (!cancelled) Alert.alert('无法读取账户', error instanceof Error ? error.message : '请稍后重试');
    });
    return () => { cancelled = true; };
  }, [accountId, repository, router]);

  // 日期选择器
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'statement' | 'due'>('statement');

  const isLiability = template.kind === 'liability';
  const brand = findBrandAssets(template.id);

  const remainingCents = (() => {
    const limit = parseAmountToCents(creditLimit);
    const debt = parseAmountToCents(currentDebt);
    if (!limit && !debt) return null;
    return limit - debt;
  })();
  const remainingText = remainingCents !== null ? `¥${(remainingCents / 100).toFixed(2)}` : '';

  function openPicker(target: 'statement' | 'due') {
    setPickerTarget(target);
    setPickerVisible(true);
  }

  function handlePickerConfirm(day: number) {
    if (pickerTarget === 'statement') setStatementDay(String(day));
    else setDueDay(String(day));
    setPickerVisible(false);
  }

  async function handleSubmit() {
    try {
      if (accountId) {
        await repository.update(accountId, {
          name: name.trim() || template.label,
          creditLimitCents: hasBillingCycle ? parseAmountToCents(creditLimit) || null : null,
          statementDay: hasBillingCycle ? parseDayInput(statementDay) : null,
          dueDay: hasBillingCycle ? parseDayInput(dueDay) : null,
          status,
          includeInNetWorth,
        });
        router.back();
        return;
      }
      const initialBalanceCents = parseAmountToCents(currentDebt);
      const shouldSyncInitialBalance = syncLedger && initialBalanceCents > 0;
      const createdAccountId = await createAccount(repository, {
        name: name.trim() || template.label,
        type: template.type,
        kind: template.kind,
        icon: template.icon,
        color: template.color,
        initialBalanceCents: shouldSyncInitialBalance ? 0 : initialBalanceCents,
        creditLimitCents: hasBillingCycle ? parseAmountToCents(creditLimit) || null : null,
        statementDay: hasBillingCycle ? parseDayInput(statementDay) : null,
        dueDay: hasBillingCycle ? parseDayInput(dueDay) : null,
        status,
        includeInNetWorth,
      });
      if (shouldSyncInitialBalance) {
        const db = repository['db'] as import('expo-sqlite').SQLiteDatabase;
        const now = new Date().toISOString();
        const txId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount_cents, category_id, account_id, occurred_at, note, created_at, updated_at)
           VALUES (?, ?, ?, 'initial-balance', ?, ?, '资产初始化', ?, ?)`,
          txId, isLiability ? 'expense' : 'income', initialBalanceCents, createdAccountId, now, now, now
        );
      }
      router.dismissAll();
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  const currentPickerDay = parseInt(pickerTarget === 'statement' ? statementDay : dueDay) || 1;

  return (
    <ThemedView style={[s.container, s.simpleContainer]}>
      <SafeAreaView edges={['top', 'bottom']} style={s.safeArea}>
        <View style={[s.header, s.simpleHeader]}>
          <Pressable
            onPress={() => router.back()}
            style={s.backButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="返回">
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back_ios_new', web: 'arrow_back_ios_new' }}
              size={24}
              tintColor="#17212B"
            />
          </Pressable>
          <ThemedText style={[s.title, s.simpleTitle]}>{isEditing ? '编辑账户' : '新建账户'}</ThemedText>
          <View style={s.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={[s.content, s.simpleContent, hasBillingCycle && s.creditContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ① 资产类型 */}
          <View style={[s.card, s.simpleCard]}>
            <ThemedText style={[s.cardTitle, s.simpleCardTitle]}>资产类型</ThemedText>
            <Pressable
              onPress={() => { if (!isEditing) router.back(); }}
              disabled={isEditing}
              style={[s.typeRow, s.simpleTypeRow]}
              accessibilityRole="button">
              <View style={[s.typeIcon, s.simpleTypeIcon, !brand?.icon && { backgroundColor: `${template.color}1A` }]}>
                {brand?.icon
                  ? <Image source={brand.icon} style={s.typeIconImg} contentFit="contain" />
                  : <ThemedText style={s.typeIconEmoji}>{template.icon}</ThemedText>}
              </View>
              <ThemedText style={[s.typeLabel, s.simpleTypeLabel]}>{template.label}</ThemedText>
              {!isEditing ? <ThemedText style={s.chevron}>›</ThemedText> : null}
            </Pressable>
          </View>

          {/* ② 基本信息 */}
          <View style={[s.card, s.simpleCard]}>
            <ThemedText style={[s.cardTitle, s.simpleCardTitle]}>基本信息</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="账户名称（选填）"
              placeholderTextColor="#737373"
              style={[s.input, s.simpleInput]}
            />
            {isSimpleAccount ? (
              <View style={s.balanceInput}>
                <TextInput
                  value={currentDebt}
                  onChangeText={setCurrentDebt}
                  placeholder={isEditing ? '当前余额（只读）' : isLiability ? '当前欠款' : '账户余额'}
                  placeholderTextColor="#737373"
                  keyboardType="decimal-pad"
                  editable={!isEditing}
                  style={[s.balanceTextInput, isEditing && s.inputReadonly]}
                />
                <SymbolView
                  name={{ ios: 'banknote', android: 'payments', web: 'payments' }}
                  size={24}
                  tintColor="#858585"
                />
              </View>
            ) : null}
          </View>

          {/* ③ 资金 */}
          {hasBillingCycle ? (
            <View style={[s.card, s.simpleCard]}>
              <ThemedText style={[s.cardTitle, s.simpleCardTitle]}>资金</ThemedText>
              <View style={s.creditFieldRow}>
                <TextInput
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  placeholder="信用额度"
                  placeholderTextColor="#737373"
                  keyboardType="decimal-pad"
                  style={[s.input, s.simpleInput, s.creditHalfInput]}
                />
                <TextInput
                  value={currentDebt}
                  onChangeText={setCurrentDebt}
                  placeholder={isEditing ? '当前欠款（只读）' : '当前欠款'}
                  placeholderTextColor="#737373"
                  keyboardType="decimal-pad"
                  editable={!isEditing}
                  style={[s.input, s.simpleInput, s.creditHalfInput, isEditing && s.inputReadonly]}
                />
              </View>
              <TextInput
                value={remainingText}
                editable={false}
                placeholder="剩余额度"
                placeholderTextColor="#8B8B8B"
                style={[s.input, s.simpleInput, s.inputReadonly]}
              />
              <View style={[s.hintRow, s.simpleHintRow]}>
                <ThemedText style={s.hintIcon}>ⓘ</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                  当前欠款和信用额度填写一项即可自动计算
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* ④ 账单/还款日期 */}
          {hasBillingCycle ? (
            <View style={[s.card, s.simpleCard]}>
              <ThemedText style={[s.cardTitleDark, s.simpleCardTitle]}>账单/还款日期</ThemedText>
              <View style={s.creditDateRow}>
                <Pressable
                  onPress={() => openPicker('statement')}
                  style={s.creditDateItem}
                  accessibilityRole="button">
                  <ThemedText style={[s.dayLabel, s.dayLabelActive]}>账单日</ThemedText>
                  <ThemedText style={s.creditDateValue}>
                    {statementDay ? `每月${statementDay}日` : '每月1日'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => openPicker('due')}
                  style={s.creditDateItem}
                  accessibilityRole="button">
                  <ThemedText style={s.dayLabel}>还款日</ThemedText>
                  <ThemedText style={s.creditDateValue}>
                    {dueDay ? `每月${dueDay}日` : '每月10日'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* ⑤ 余额同步 */}
          {!isEditing ? <View style={[s.card, s.simpleCard]}>
            <Pressable
              onPress={() => setSyncExpanded((expanded) => !expanded)}
              style={s.syncHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded: syncExpanded }}>
              <View style={s.syncTitleRow}>
                <View style={s.syncAccent} />
                <ThemedText style={s.simpleCardTitle}>余额同步</ThemedText>
              </View>
              <SymbolView
                name={syncExpanded
                  ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
                  : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                size={20}
                tintColor="#8A8A8A"
              />
            </Pressable>
            {syncExpanded ? (
              <>
                <View style={s.toggleRow}>
                  <View style={s.toggleInfo}>
                    <ThemedText style={s.toggleLabel}>同时记一笔账单</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">将初始金额记录为一笔内部转账</ThemedText>
                  </View>
                  <Switch
                    value={syncLedger}
                    onValueChange={setSyncLedger}
                    trackColor={{ false: '#E0E5EA', true: '#28C85A' }}
                    thumbColor="#FFFFFF"
                    style={s.simpleSwitch}
                  />
                </View>
                <View style={[s.hintRow, s.simpleHintRow]}>
                  <ThemedText style={s.hintIcon}>ⓘ</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                    打开后会生成一笔【资产初始化】内部转账记录，方便查看后续变动。
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View> : null}

          {/* ⑥ 其他 */}
          <View style={[s.card, s.simpleCard]}>
            <ThemedText style={[s.cardTitle, s.simpleCardTitle]}>其他</ThemedText>
            {/* 资产状态：按钮在右，label 在按钮组底端左侧 */}
            <View style={[s.statusRow, s.simpleStatusRow]}>
              <ThemedText style={s.toggleLabel}>资产状态</ThemedText>
              <StatusSegment value={status} onChange={setStatus} compact />
            </View>
            {/* 计入总资产 */}
            <View style={[s.toggleRow, s.simpleNetWorthRow]}>
              <View style={s.toggleInfo}>
                <ThemedText style={s.toggleLabel}>计入总资产</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">是否加入总资产计算</ThemedText>
              </View>
              <Switch
                value={includeInNetWorth}
                onValueChange={setIncludeInNetWorth}
                trackColor={{ false: '#E0E5EA', true: '#28C85A' }}
                thumbColor="#FFFFFF"
                style={s.simpleSwitch}
              />
            </View>
          </View>

          <Pressable
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [
              s.submitButton,
              s.simpleSubmitButton,
              pressed && s.submitButtonPressed,
            ]}
            accessibilityRole="button">
            <ThemedText style={[s.submitText, s.simpleSubmitText]}>保存</ThemedText>
          </Pressable>

        </ScrollView>
      </SafeAreaView>

      {/* 日期选择器 Modal */}
      <DayPickerModal
        visible={pickerVisible}
        selected={currentPickerDay}
        onClose={() => setPickerVisible(false)}
        onConfirm={handlePickerConfirm}
      />

    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  simpleContainer: { backgroundColor: '#F7F7F7' },
  safeArea: { flex: 1 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  simpleHeader: { minHeight: 48, paddingHorizontal: 6 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, lineHeight: 34, fontWeight: FontWeight.regular, color: '#17212B' },
  title: { ...Type.headline, fontWeight: FontWeight.semibold },
  simpleTitle: { ...Type.title, fontWeight: FontWeight.semibold, color: '#101010' },
  headerSpacer: { width: 22 },
  content: { paddingHorizontal: 14, paddingBottom: 48, gap: 12 },
  simpleContent: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 20, gap: 8 },
  creditContent: { paddingBottom: 28 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 12 },
  simpleCard: {
    borderRadius: 16,
    padding: 12,
    gap: 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },
  cardGreenBorder: { borderLeftWidth: 4, borderLeftColor: '#3DC06B' },
  cardTitle: { ...Type.subhead, fontWeight: FontWeight.semibold, color: '#71808C' },
  simpleCardTitle: { ...Type.body, fontWeight: FontWeight.semibold, color: '#171717' },
  cardTitleDark: { ...Type.body, fontWeight: FontWeight.semibold, color: '#17212B' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, ...Type.body, color: '#17212B', backgroundColor: '#F5F7FA' },
  simpleInput: { minHeight: 44, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, ...Type.body, color: '#171717', backgroundColor: '#F7F7F7' },
  creditFieldRow: { flexDirection: 'row', gap: 8 },
  creditHalfInput: { flex: 1, minWidth: 0 },
  balanceInput: { minHeight: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F7F7F7' },
  balanceTextInput: { flex: 1, padding: 0, ...Type.body, color: '#171717' },
  inputReadonly: { color: '#71808C' },
  hintRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  simpleHintRow: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, gap: 6, backgroundColor: '#F7F7F7' },
  hintIcon: { ...Type.subhead, color: '#A8B4BE', marginTop: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  simpleTypeRow: { minHeight: 44 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  simpleTypeIcon: { width: 40, height: 40, borderRadius: 12 },
  typeIconImg: { width: '100%', height: '100%' },
  typeIconEmoji: { fontSize: 20, lineHeight: 24 },
  typeLabel: { ...Type.body, fontWeight: FontWeight.semibold, flex: 1 },
  simpleTypeLabel: { ...Type.body, color: '#171717' },
  chevron: { fontSize: 20, color: '#C3CBD2' },
  // 账单日期行
  dayRow: { backgroundColor: '#F5F7FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  dayLabel: { ...Type.footnote, color: '#71808C' },
  dayLabelActive: { color: '#3DC06B' },
  dayValue: { ...Type.title, fontWeight: FontWeight.semibold, color: '#17212B' },
  creditDateRow: { flexDirection: 'row', gap: 8 },
  creditDateItem: { flex: 1, minHeight: 60, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, justifyContent: 'center', gap: 2, backgroundColor: '#F7F7F7' },
  creditDateValue: { ...Type.headline, fontWeight: FontWeight.semibold, color: '#17212B' },
  // 余额同步 / 其他 行
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { ...Type.body, fontWeight: FontWeight.semibold },
  simpleSwitch: { transform: [{ scaleX: 0.96 }, { scaleY: 0.96 }] },
  syncHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  syncAccent: { width: 5, height: 17, borderRadius: 999, backgroundColor: '#B9E7C6' },
  borderTop: { borderTopWidth: 1, borderTopColor: '#F0F2F4', paddingTop: 12, marginTop: -4 },
  // 资产状态行（label 在按钮组底端左侧）
  statusRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  simpleStatusRow: { minHeight: 62 },
  simpleNetWorthRow: { paddingTop: 5 },
  submitButton: { backgroundColor: '#3DC06B', borderRadius: 16, alignItems: 'center', paddingVertical: 17, marginTop: 8 },
  simpleSubmitButton: { borderRadius: 999, marginHorizontal: 10, marginTop: 8, marginBottom: 6, paddingVertical: 13, backgroundColor: '#91D19F' },
  submitButtonDisabled: { backgroundColor: '#B8DDBF' },
  submitButtonPressed: { opacity: 0.82 },
  submitText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  simpleSubmitText: { ...Type.headline, color: '#111111', fontWeight: FontWeight.medium },
});
