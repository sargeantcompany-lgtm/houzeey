import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { ListingImage } from '@/components/ListingImage';
import { api, type Listing } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { factsLine, placeLine, priceText } from '@/lib/format';
import { colors, radius, serif } from '@/lib/theme';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<Listing[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setItems(await api.saved.list());
    } catch (e) {
      setError((e as Error).message);
      setItems(prev => prev ?? []);
    }
  }, []);

  // Reload every time the tab is opened, so homes saved elsewhere show up.
  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [user, load]),
  );

  async function unsave(id: string) {
    setItems(list => list?.filter(l => l.id !== id) ?? null);
    api.saved.unsave(id).catch(load);
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.h1}>Saved homes</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <View style={styles.empty}>
          <Icon name="bookmark" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Keep track of homes you love</Text>
          <Text style={styles.emptyText}>Log in to save homes and find them here on any device.</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <Button title="Log in" onPress={() => router.push('/login')} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={items ?? []}
      keyExtractor={l => l.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brand} />}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}>
          <View style={styles.thumb}>
            <ListingImage uri={item.primary_image} id={item.id} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.price}>{priceText(item)}</Text>
            <Text style={styles.place} numberOfLines={1}>{placeLine(item)}</Text>
            <Text style={styles.facts} numberOfLines={1}>{factsLine(item)}</Text>
          </View>
          <Pressable hitSlop={10} onPress={() => unsave(item.id)} accessibilityLabel="Remove from saved">
            <Icon name="bookmarkFill" size={24} color={colors.brand} />
          </Pressable>
        </Pressable>
      )}
      ListEmptyComponent={
        items === null ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={colors.brand} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error ? 'Couldn’t load saved homes' : 'No saved homes yet'}</Text>
            <Text style={styles.emptyText}>{error || 'Tap the bookmark on any home to save it here.'}</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  h1: { fontFamily: serif, fontSize: 30, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 10 },
  thumb: { width: 96, height: 80, borderRadius: radius.md, overflow: 'hidden' },
  price: { fontWeight: '800', fontSize: 16.5, color: colors.ink },
  place: { fontSize: 14, color: colors.ink },
  facts: { fontSize: 13, color: colors.muted },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  emptyText: { fontSize: 14.5, color: colors.muted, textAlign: 'center' },
});
