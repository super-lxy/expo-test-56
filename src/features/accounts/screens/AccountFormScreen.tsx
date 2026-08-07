import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { parseAmountToCents } from '@/shared/utils/currency';
import { createAccount } from '../application/createAccount';
import { findTemplate } from '../domain/account.templates';
import { useAccountRepository } from '../hooks/useAccountRepository';

export function AccountFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string }>();
  const repository = useAccountRepository();
  const template = findTemplate(typeof params.templateId === 'string' ? params.templateId : 'cash')
    ?? findTemplate('cash')!;
  const [name, setName] = useState(template.label);
  const [initialBalance, setInitialBalance] = useState('');
  const isLiability = template.kind === 'liability';

  async function handleSubmit() {
    try {
      await createAccount(repository, {
        name,
        type: template.type,
        kind: template.kind,
        icon: template.icon,
        color: template.color,
        initialBalanceCents: parseAmountToCents(initialBalance),
      });
      router.dismissAll();
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>{template.label}</ThemedText>
          <Pressable onPress={() => void handleSubmit()} hitSlop={10}>
            <ThemedText style={styles.save}>保存</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.preview}>
            <View style={[styles.previewIcon, { backgroundColor: `${template.color}1A` }]}>
              <ThemedText style={styles.previewIconText}>{template.icon}</ThemedText>
            </View>
            <View style={styles.previewInfo}>
              <ThemedText style={styles.previewLabel}>{template.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{template.hint}</ThemedText>
            </View>
            <View style={[styles.badge, isLiability ? styles.badgeLiability : styles.badgeAsset]}>
              <ThemedText style={[styles.badgeText, isLiability ? styles.badgeTextLiability : styles.badgeTextAsset]}>
                {isLiability ? '负债' : '资产'}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.label}>账户名称</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={`例如：${template.label}`}
            placeholderTextColor="#A8B4BE"
            style={styles.input}
          />

          <ThemedText style={styles.label}>{isLiability ? '当前欠款' : '当前余额'}</ThemedText>
          <TextInput
            value={initialBalance}
            onChangeText={setInitialBalance}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#A8B4BE"
            style={styles.input}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {isLiability ? '填写目前尚未还清的金额，会计入负债合计。' : '填写账户目前的余额，后续收支会自动更新。'}
          </ThemedText>

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
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { fontSize: 34, lineHeight: 36, fontWeight: '300', color: '#17212B' },
  title: { fontSize: 16, fontWeight: '700' },
  save: { color: '#167C80', fontWeight: '700', fontSize: 15 },
  content: { padding: 14, paddingBottom: 40, gap: 8 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEDEF', marginBottom: 6 },
  previewIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  previewIconText: { fontSize: 24 },
  previewInfo: { flex: 1, gap: 3 },
  previewLabel: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeAsset: { backgroundColor: '#E3F3EA' },
  badgeLiability: { backgroundColor: '#FCE8E4' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextAsset: { color: '#1F8A5F' },
  badgeTextLiability: { color: '#C4432F' },
  label: { fontWeight: '700', fontSize: 14, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#DDE3E8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#17212B', backgroundColor: '#FFFFFF' },
  submitButton: { backgroundColor: '#17212B', borderRadius: 16, alignItems: 'center', paddingVertical: 16, marginTop: 20 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
