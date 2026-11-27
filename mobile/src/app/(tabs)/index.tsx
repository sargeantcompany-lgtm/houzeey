import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { PostCard } from '@/components/PostCard';
import { api, type Post } from '@/lib/api';
import { colors, radius } from '@/lib/theme';

const PAGE = 10;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const loadingMore = useRef(false);

  const load = useCallback(async (q: string, offset: number) => {
    const res = await api.feed({ q, limit: PAGE, offset });
    setPosts(prev => (offset === 0 ? res.posts : [...prev, ...res.posts]));
    setHasMore(res.hasMore);
  }, []);

  useEffect(() => {
    api.feed({ q: search, limit: PAGE, offset: 0 })
      .then(res => {
        setPosts(res.posts);
        setHasMore(res.hasMore);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  function runSearch(q: string) {
    if (q === search) return;
    setLoading(true);
    setError('');
    setPosts([]);
    setSearch(q);
  }

  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      await load(search, 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore.current || loading) return;
    loadingMore.current = true;
    try {
      await load(search, posts.length);
    } catch {
      // keep what we have; pulling to refresh will retry
    } finally {
      loadingMore.current = false;
    }
  }

  const header = (
    <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
      <Logo />
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search suburb, postcode or state"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query.trim())}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {!!search && (
          <Pressable hitSlop={8} onPress={() => { setQuery(''); runSearch(''); }} accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={posts}
      keyExtractor={p => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={header}
      stickyHeaderIndices={[0]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      keyboardDismissMode="on-drag"
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={colors.brand} />
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn’t load homes</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={styles.retry} onPress={refresh}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{search ? `No homes in “${search}” yet` : 'No homes yet'}</Text>
            <Text style={styles.emptyText}>New private sales appear here as owners list them.</Text>
          </View>
        )
      }
      ListFooterComponent={posts.length > 0 && hasMore ? <ActivityIndicator style={{ margin: 24 }} color={colors.brand} /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.bg, paddingHorizontal: 14, paddingBottom: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgAlt, borderRadius: radius.md, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: colors.line },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 70, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  emptyText: { fontSize: 14.5, color: colors.muted, textAlign: 'center' },
  retry: { marginTop: 10, backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.white, fontWeight: '700' },
});
