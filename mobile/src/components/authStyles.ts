import { StyleSheet } from 'react-native';

import { colors, serif } from '@/lib/theme';

export const authStyles = StyleSheet.create({
  wrap: { padding: 22, gap: 16, paddingBottom: 60 },
  head: { alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 8 },
  title: { fontSize: 26, fontFamily: serif, color: colors.ink, marginTop: 10 },
  sub: { fontSize: 14.5, color: colors.muted, textAlign: 'center' },
  link: { color: colors.brand, fontWeight: '600', textAlign: 'center', fontSize: 15 },
  linkStrong: { color: colors.brand, fontWeight: '700', fontSize: 14.5 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
