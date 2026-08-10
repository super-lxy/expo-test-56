import { Image } from 'expo-image';
import type { ImageStyle, StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CategoryIconType } from '../domain/category.types';

export function CategoryIcon({
  icon,
  iconType = 'emoji',
  imageSize,
  imageStyle,
  textStyle,
}: {
  icon: string;
  iconType?: CategoryIconType;
  imageSize: number;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  if (iconType === 'image' && icon) {
    return (
      <Image
        source={{ uri: icon }}
        style={[
          {
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize * 0.24,
            overflow: 'hidden',
          },
          imageStyle,
        ]}
        contentFit="contain"
        transition={120}
      />
    );
  }

  return <ThemedText style={textStyle}>{icon || '📌'}</ThemedText>;
}
