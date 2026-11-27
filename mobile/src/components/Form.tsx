import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius } from '@/lib/theme';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

type ButtonProps = { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'outline' | 'danger' };

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, styles[variant], (pressed || off) && { opacity: 0.7 }]}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.brand : colors.white} />
      ) : (
        <Text style={[styles.btnText, variant === 'outline' && { color: colors.brand }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, height: 48,
    fontSize: 16, color: colors.ink, backgroundColor: colors.bg,
  },
  btn: { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primary: { backgroundColor: colors.brand },
  outline: { borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.bg },
  danger: { backgroundColor: '#dc2626' },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  error: { color: '#dc2626', fontSize: 14, backgroundColor: '#fef2f2', borderRadius: radius.sm, padding: 10, overflow: 'hidden' },
});
