import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAiConfig, saveAiConfig } from '@/features/ai/data/aiConfig';
import { probeAiModels } from '@/features/ai/data/aiLedgerApi';

function normalizeProviderBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  const parsed = new URL(trimmed);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
  return trimmed;
}

export function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [providerBaseUrl, setProviderBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [probingModels, setProbingModels] = useState(false);

  useEffect(() => {
    void getAiConfig()
      .then((config) => {
        setProviderBaseUrl(config.providerBaseUrl);
        setModel(config.model);
        setHasStoredApiKey(Boolean(config.apiKey));
      })
      .catch(() => Alert.alert('无法读取 AI 配置', '请稍后重试。'));
  }, []);

  async function handleSaveAiConfig() {
    let trimmedBaseUrl = '';
    try { trimmedBaseUrl = normalizeProviderBaseUrl(providerBaseUrl); }
    catch { Alert.alert('Base URL 无效', '请输入以 http:// 或 https:// 开头的地址。'); return; }
    setSavingAiConfig(true);
    try {
      const currentConfig = await getAiConfig();
      const nextApiKey = apiKey.trim() || currentConfig.apiKey;
      await saveAiConfig({ providerBaseUrl: trimmedBaseUrl, model, apiKey: nextApiKey });
      setHasStoredApiKey(Boolean(nextApiKey));
      setApiKey('');
      Alert.alert('已保存', '后续图片识别会使用这组配置。');
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSavingAiConfig(false);
    }
  }

  async function handleProbeModels() {
    let trimmedBaseUrl = '';
    try { trimmedBaseUrl = normalizeProviderBaseUrl(providerBaseUrl); }
    catch { Alert.alert('Base URL 无效', '请输入以 http:// 或 https:// 开头的地址。'); return; }
    let currentConfig;
    try { currentConfig = await getAiConfig(); }
    catch { Alert.alert('无法读取当前配置', '请稍后重试。'); return; }
    const nextApiKey = apiKey.trim() || currentConfig.apiKey;
    if (!nextApiKey) { Alert.alert('还没有 API Key', '请先填写 API Key，再探测模型。'); return; }
    setProbingModels(true);
    try {
      const models = await probeAiModels({ providerBaseUrl: trimmedBaseUrl, apiKey: nextApiKey });
      setAvailableModels(models);
      setModel((current) => models.includes(current) ? current : models[0]);
      Alert.alert('探测成功', `找到 ${models.length} 个模型，请选择用于图片识别的模型。`);
    } catch (error) {
      Alert.alert('探测失败', error instanceof Error ? error.message : '请检查 Base URL 和 API Key');
    } finally {
      setProbingModels(false);
    }
  }

  async function handleResetAiConfig() {
    setSavingAiConfig(true);
    try {
      await saveAiConfig({ providerBaseUrl: '', model: '', apiKey: '' });
      const config = await getAiConfig();
      setProviderBaseUrl(config.providerBaseUrl);
      setModel(config.model);
      setApiKey('');
      setHasStoredApiKey(false);
      Alert.alert('已恢复默认', '已清除本设备保存的 AI 配置。');
    } catch (error) {
      Alert.alert('恢复失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSavingAiConfig(false);
    }
  }

  async function handleClearApiKey() {
    setSavingAiConfig(true);
    try {
      const currentConfig = await getAiConfig();
      await saveAiConfig({ ...currentConfig, apiKey: '' });
      setHasStoredApiKey(false);
      setApiKey('');
      Alert.alert('已清除', '本机保存的 API Key 已删除。');
    } catch (error) {
      Alert.alert('清除失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSavingAiConfig(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <AppBackground />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.eyebrow} themeColor="textSecondary">偏好与管理</ThemedText>
          <ThemedText type="title" style={styles.title}>设置</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>本地账本</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">数据保存在当前设备，后续将加入导入导出功能。</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/categories')} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>分类管理</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">自定义大分类和具体用途</ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/tags')} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>标签管理</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">按人员、平台或项目整理每笔账单</ThemedText>
          </Pressable>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>AI 服务配置</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">可使用 OpenAI 或兼容 Responses API 的服务。探测和图片识别都会直接访问你填写的 Base URL。</ThemedText>
            <TextInput
              value={providerBaseUrl}
              onChangeText={setProviderBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="Base URL（可留空，默认 OpenAI）"
              placeholderTextColor={AppPalette.textFaint}
              style={[styles.input, { color: theme.text }]}
            />
            <View style={styles.modelRow}>
              <TextInput
                value={model}
                onChangeText={setModel}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Model（先探测，或手动输入）"
                placeholderTextColor={AppPalette.textFaint}
                style={[styles.input, styles.modelInput, { color: theme.text }]}
              />
              <Pressable disabled={probingModels || savingAiConfig} onPress={() => void handleProbeModels()} style={styles.probeButton}>
                <ThemedText style={styles.probeButtonText}>{probingModels ? '探测中…' : '探测'}</ThemedText>
              </Pressable>
            </View>
            {availableModels.length > 0 ? <View style={styles.modelOptions}>
              {availableModels.slice(0, 30).map((availableModel) => <Pressable key={availableModel} onPress={() => setModel(availableModel)} style={[styles.modelOption, model === availableModel && styles.selectedModelOption]}>
                <ThemedText style={[styles.modelOptionText, model === availableModel && styles.selectedModelOptionText]} numberOfLines={1}>{availableModel}</ThemedText>
              </Pressable>)}
            </View> : null}
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder={hasStoredApiKey ? 'API Key（已保存，留空保持不变）' : 'API Key（留空使用服务端 Key）'}
              placeholderTextColor={AppPalette.textFaint}
              style={[styles.input, { color: theme.text }]}
            />
            <View style={styles.aiActions}>
              {hasStoredApiKey ? <Pressable disabled={savingAiConfig} onPress={() => void handleClearApiKey()} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>清除 Key</ThemedText>
              </Pressable> : null}
              <Pressable disabled={savingAiConfig} onPress={() => void handleResetAiConfig()} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>恢复默认</ThemedText>
              </Pressable>
              <Pressable disabled={savingAiConfig} onPress={() => void handleSaveAiConfig()} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>{savingAiConfig ? '保存中…' : '保存配置'}</ThemedText>
              </Pressable>
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>关于</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">记账 App MVP · Expo SDK 56</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  eyebrow: { ...Type.footnote, fontWeight: FontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { marginBottom: Spacing.two },
  card: { backgroundColor: AppPalette.surface, borderRadius: 18, padding: Spacing.four, gap: Spacing.one, borderWidth: 1, borderColor: AppPalette.line, shadowColor: AppPalette.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardTitle: { ...Type.body, fontWeight: FontWeight.semibold },
  input: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: AppPalette.surfaceMuted, borderWidth: 1, borderColor: AppPalette.line, ...Type.body },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  modelInput: { flex: 1 },
  probeButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: AppPalette.primary },
  probeButtonText: { ...Type.footnote, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  modelOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflow: 'hidden' },
  modelOption: { maxWidth: '100%', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: AppPalette.surfaceMuted, borderWidth: 1, borderColor: AppPalette.line },
  selectedModelOption: { backgroundColor: AppPalette.lavenderSoft, borderColor: AppPalette.primary },
  modelOptionText: { ...Type.caption, color: AppPalette.inkSoft },
  selectedModelOptionText: { color: AppPalette.primary, fontWeight: FontWeight.semibold },
  aiActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  secondaryButton: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: AppPalette.surfaceMuted },
  secondaryButtonText: { ...Type.footnote, color: AppPalette.inkSoft, fontWeight: FontWeight.semibold },
  primaryButton: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: AppPalette.primary },
  primaryButtonText: { ...Type.footnote, color: '#FFFFFF', fontWeight: FontWeight.semibold },
});
