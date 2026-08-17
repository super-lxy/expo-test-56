import * as SecureStore from 'expo-secure-store';

export type AiConfig = {
  providerBaseUrl: string;
  model: string;
  apiKey: string;
};

const PROVIDER_BASE_URL_KEY = 'ai.provider-base-url';
const MODEL_KEY = 'ai.model';
const API_KEY_KEY = 'ai.api-key';

const envDefaults = {
  providerBaseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL?.trim() ?? '',
  model: process.env.EXPO_PUBLIC_AI_MODEL?.trim() ?? '',
};

export async function getAiConfig(): Promise<AiConfig> {
  const [baseUrl, model, apiKey] = await Promise.all([
    SecureStore.getItemAsync(PROVIDER_BASE_URL_KEY),
    SecureStore.getItemAsync(MODEL_KEY),
    SecureStore.getItemAsync(API_KEY_KEY),
  ]);
  return {
    providerBaseUrl: baseUrl?.trim() || envDefaults.providerBaseUrl,
    model: model?.trim() || envDefaults.model,
    apiKey: apiKey?.trim() ?? '',
  };
}

export async function saveAiConfig(config: AiConfig) {
  const writes = [
    config.providerBaseUrl.trim()
      ? SecureStore.setItemAsync(PROVIDER_BASE_URL_KEY, config.providerBaseUrl.trim())
      : SecureStore.deleteItemAsync(PROVIDER_BASE_URL_KEY),
    config.model.trim()
      ? SecureStore.setItemAsync(MODEL_KEY, config.model.trim())
      : SecureStore.deleteItemAsync(MODEL_KEY),
    config.apiKey.trim()
      ? SecureStore.setItemAsync(API_KEY_KEY, config.apiKey.trim())
      : SecureStore.deleteItemAsync(API_KEY_KEY),
  ];
  await Promise.all(writes);
}
