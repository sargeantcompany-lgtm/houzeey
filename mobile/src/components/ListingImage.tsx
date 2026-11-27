import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { hueFor } from '@/lib/format';
import { colors } from '@/lib/theme';
import { Icon } from './Icon';

// A listing photo, or a calm coloured panel with a house icon when there's no photo yet.
export function ListingImage({ uri, id, style }: { uri?: string | null; id: string; style?: StyleProp<ViewStyle> }) {
  if (!uri) {
    return (
      <View style={[styles.placeholder, { backgroundColor: hueFor(id) }, style]}>
        <Icon name="house" size={40} color={colors.white} />
      </View>
    );
  }
  return <Image source={{ uri }} style={[styles.fill, style as object]} contentFit="cover" transition={150} />;
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
