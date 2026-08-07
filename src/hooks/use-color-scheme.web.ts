import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Web 端 useColorScheme 的封装。
 * Expo web 使用 static output，没有 SSR，所以可以直接读取系统偏好；
 * `?? 'light'` 处理初始帧 useColorScheme 返回 null 的情况。
 */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}
