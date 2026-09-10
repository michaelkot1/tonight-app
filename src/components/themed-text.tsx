import { Text, type TextProps } from 'react-native';

import { type as typeStyles, type TypeToken } from '@/theme';

interface ThemedTextProps extends TextProps {
  variant?: TypeToken;
}

export function ThemedText({
  variant = 'body',
  style,
  ...props
}: ThemedTextProps) {
  return <Text style={[typeStyles[variant], style]} {...props} />;
}
