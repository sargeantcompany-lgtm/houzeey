import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

// The Houzeey house mark plus the wordmark.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Houzeey">
      <Image source={require('@/assets/images/logo-mark.png')} style={{ width: size, height: size }} />
      <Text style={[styles.word, { fontSize: size * 0.72 }]}>HOUZEEY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: { fontWeight: '800', color: colors.ink, letterSpacing: 1.2 },
});
