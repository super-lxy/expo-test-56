import { Image } from 'expo-image';
import type { ImageStyle, StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CategoryIconType } from '../domain/category.types';

export function CategoryIcon({
  icon,
  iconType = 'emoji',
  imageSize,
  boxSize,
  imageStyle,
  textStyle,
}: {
  icon: string;
  iconType?: CategoryIconType;
  /**
   * Mixed emoji/image display should pass the outer icon box size.
   * The component then normalizes both formats to the same optical weight.
   */
  boxSize?: number;
  /** Exact image size for image-only previews that do not render emoji. */
  imageSize?: number;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const normalizedImageSize = boxSize ? Math.round(boxSize * 0.66) : (imageSize ?? 24);
  const normalizedEmojiSize = boxSize ? Math.round(boxSize * 0.52) : undefined;

  if (iconType === 'image' && icon) {
    return (
      <Image
        source={{ uri: icon }}
        style={[
          {
            width: normalizedImageSize,
            height: normalizedImageSize,
            borderRadius: normalizedImageSize * 0.24,
            overflow: 'hidden',
          },
          imageStyle,
        ]}
        contentFit="contain"
        transition={120}
      />
    );
  }

  return (
    <ThemedText style={[
      textStyle,
      normalizedEmojiSize
        ? { fontSize: normalizedEmojiSize, lineHeight: Math.round(normalizedEmojiSize * 1.25) }
        : null,
    ]}>
      {icon || '📌'}
    </ThemedText>
  );
}
