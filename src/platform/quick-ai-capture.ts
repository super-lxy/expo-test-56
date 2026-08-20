import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type QuickTileSetupMode = 'prompt' | 'manual' | 'unsupported';
export type QuickTileRequestResult = QuickTileSetupMode | 'added' | 'already-added' | 'not-added' | 'unavailable' | 'error';

export type PendingQuickCapture = {
  uri: string;
  width: number;
  height: number;
};

type QuickLedgerNativeModule = {
  getTileSetupMode(): QuickTileSetupMode;
  requestAddTile(): Promise<QuickTileRequestResult>;
  consumePendingCapture(token: string): Promise<PendingQuickCapture | null>;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<QuickLedgerNativeModule>('QuickLedger')
  : null;

export function getQuickTileSetupMode(): QuickTileSetupMode {
  return nativeModule?.getTileSetupMode() ?? 'unsupported';
}

export async function requestAddQuickLedgerTile(): Promise<QuickTileRequestResult> {
  return nativeModule?.requestAddTile() ?? 'unsupported';
}

export async function consumePendingQuickCapture(token: string): Promise<PendingQuickCapture | null> {
  return nativeModule?.consumePendingCapture(token) ?? null;
}
