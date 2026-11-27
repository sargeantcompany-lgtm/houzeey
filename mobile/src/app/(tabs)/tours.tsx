import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ListViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { api, type Post } from '@/lib/api';
import { factsLine, placeLine, priceText } from '@/lib/format';
import { colors, radius } from '@/lib/theme';
import { useRequireLogin } from '@/lib/useRequireLogin';

// Full-screen vertical video tours, one home per screen. Only the tour on screen plays.
export default function ToursScreen() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const focused = useIsFocused();
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [height, setHeight] = useState(0);
  const fetching = useRef(false);

  const load = useCallback(async (offset: number) => {
    const res = await api.feed({ filter: 'video', limit: 8, offset });
    const withVideo = res.posts.filter(p => p.video);
    setPosts(prev => (offset === 0 ? withVideo : [...prev, ...withVideo]));
    setHasMore(res.hasMore);
  }, []);

  useEffect(() => {
    api.feed({ filter: 'video', limit: 8, offset: 0 })
      .then(res => {
        setPosts(res.posts.filter(p => p.video));
        setHasMore(res.hasMore);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Opened from a post's "Video tour" button: start on that home.
  const startIndex = start ? Math.max(0, posts.findIndex(p => p.id === start)) : 0;

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActive(first.index);
  }, []);

  async function loadMore() {
    if (!hasMore || fetching.current) return;
    fetching.current = true;
    try {
      await load(posts.length);
    } catch {
      // ignore; user can keep watching what's loaded
    } finally {
      fetching.current = false;
    }
  }

  return (
    <View style={styles.screen} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      {loading || !height ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.white} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="play" size={40} color={colors.white} />
          <Text style={styles.emptyTitle}>{error ? 'Couldn’t load tours' : 'No video tours yet'}</Text>
          <Text style={styles.emptyText}>{error || 'When owners add a video to their listing, it shows up here.'}</Text>
        </View>
      ) : (
        <FlatList
          key={start || 'all'}
          data={posts}
          initialScrollIndex={startIndex}
          keyExtractor={p => p.id}
          renderItem={({ item, index }) => (
            <TourItem
              post={item}
              height={height}
              playing={focused && index === active}
              preload={Math.abs(index - active) <= 1}
              muted={muted}
              onToggleMute={() => setMuted(m => !m)}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          decelerationRate="fast"
        />
      )}
    </View>
  );
}

type TourProps = { post: Post; height: number; playing: boolean; preload: boolean; muted: boolean; onToggleMute: () => void };

const TourItem = memo(function TourItem({ post, height, playing, preload, muted, onToggleMute }: TourProps) {
  const insets = useSafeAreaInsets();
  const requireLogin = useRequireLogin();
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  // Only the tour on screen and its neighbours load video, so swiping stays smooth.
  const player = useVideoPlayer(preload && post.video ? post.video.url : null, p => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    // expo-video players are controlled by setting properties on them.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  function toggleLike() {
    requireLogin(() => {
      const next = !liked;
      setLiked(next);
      (next ? api.like(post.id) : api.unlike(post.id)).catch(() => setLiked(!next));
    });
  }
  function toggleSave() {
    requireLogin(() => {
      const next = !saved;
      setSaved(next);
      (next ? api.saved.save(post.id) : api.saved.unsave(post.id)).catch(() => setSaved(!next));
    });
  }
  const open = () => router.push({ pathname: '/listing/[id]', params: { id: post.id } });

  return (
    <View style={{ height, backgroundColor: colors.black }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onToggleMute} accessibilityLabel={muted ? 'Turn sound on' : 'Turn sound off'}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
      </Pressable>

      <View style={[styles.muteBadge, { top: insets.top + 12 }]} pointerEvents="none">
        <Icon name={muted ? 'speakerOff' : 'speaker'} size={16} color={colors.white} />
      </View>

      <View style={styles.side}>
        <Pressable onPress={toggleLike} style={styles.sideBtn} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
          <Icon name={liked ? 'heartFill' : 'heart'} size={30} color={liked ? colors.alert : colors.white} />
        </Pressable>
        <Pressable onPress={toggleSave} style={styles.sideBtn} accessibilityLabel={saved ? 'Remove from saved' : 'Save'}>
          <Icon name={saved ? 'bookmarkFill' : 'bookmark'} size={28} color={colors.white} />
        </Pressable>
        <Pressable onPress={open} style={styles.sideBtn} accessibilityLabel="Comments">
          <Icon name="comment" size={27} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={styles.price}>{priceText(post)}</Text>
        <Text style={styles.place}>{placeLine(post)}</Text>
        <Text style={styles.facts}>{factsLine(post)}</Text>
        <Pressable style={styles.viewBtn} onPress={open}>
          <Text style={styles.viewText}>View home</Text>
          <Icon name="chevron" size={14} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  emptyTitle: { color: colors.white, fontSize: 19, fontWeight: '700' },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 14.5, textAlign: 'center' },
  muteBadge: { position: 'absolute', right: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.pill, padding: 8 },
  side: { position: 'absolute', right: 10, bottom: 110, gap: 18, alignItems: 'center' },
  sideBtn: { padding: 6 },
  info: { position: 'absolute', left: 16, right: 80, bottom: 100, gap: 3 },
  price: { color: colors.white, fontSize: 24, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  place: { color: colors.white, fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  facts: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  viewBtn: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  viewText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
});
