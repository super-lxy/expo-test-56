import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const CATEGORY_ICON_SIZE = 256;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export type PreparedCategoryIcon = {
  data: Uint8Array;
  mime: 'image/png';
  previewUri: string;
};

export async function prepareCategoryIcon(uri: string): Promise<PreparedCategoryIcon> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: CATEGORY_ICON_SIZE, height: CATEGORY_ICON_SIZE });
  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    format: SaveFormat.PNG,
    compress: 1,
  });

  return {
    data: await new File(result.uri).bytes(),
    mime: 'image/png',
    previewUri: result.uri,
  };
}

export function categoryIconDataUri(data: Uint8Array | null | undefined, mime: string | null | undefined) {
  if (!data?.length) return null;
  return `data:${mime || 'image/png'};base64,${bytesToBase64(data)}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const value = (first << 16) | (second << 8) | third;

    result += BASE64_ALPHABET[(value >> 18) & 63];
    result += BASE64_ALPHABET[(value >> 12) & 63];
    result += index + 1 < bytes.length ? BASE64_ALPHABET[(value >> 6) & 63] : '=';
    result += index + 2 < bytes.length ? BASE64_ALPHABET[value & 63] : '=';
  }
  return result;
}
