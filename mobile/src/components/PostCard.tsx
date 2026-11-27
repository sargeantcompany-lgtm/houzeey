import { router } from 'expo-router';
import { memo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { api, type Post } from '@/lib/api';
import { factsLine, placeLine, priceText, statusLabel, timeAgo } from '@/lib/format';
import { colors, radius } from '@/lib/theme';
import { useRequireLogin } from '@/lib/useRequireLogin';
import { Icon } from './Icon';
import { ListingImage } from './ListingImage';

// One home in the feed, Instagram style: seller, swipeable photos, like / comment / save, price and facts.
function PostCardInner({ post }: { post: Post }) {
  const { width } = useWindowDimensions();
  const requireLogin = useRequireLogin();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [saved, setSaved] = useState(post.saved);
  const [page, setPage] = useState(0);

  const media = post.images.length ? post.images : [null];
  const height = Math.round(width * 1.1);
  const open = () => router.push({ pathname: '/listing/[id]', params: { id: post.id } });

  function toggleLike() {
    requireLogin(() => {
      const next = !liked;
      setLiked(next);
      setLikes(n => n + (next ? 1 : -1));
      (next ? api.like(post.id) : api.unlike(post.id)).catch(() => {
        setLiked(!next);
        setLikes(n => n + (next ? -1 : 1));
      });
    });
  }

  function toggleSave() {
    requireLogin(() => {
      const next = !saved;
      setSaved(next);
      (next ? api.saved.save(post.id) : api.saved.unsave(post.id)).catch(() => setSaved(!next));
    });
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={open}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(post.seller_name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.seller} numberOfLines={1}>{post.seller_name}</Text>
          <Text style={styles.place} numberOfLines={1}>{placeLine(post)}</Text>
        </View>
        <View style={[styles.badge, post.status !== 'active' && styles.badgeAlt]}>
          <Text style={[styles.badgeText, post.status !== 'active' && styles.badgeAltText]}>{statusLabel(post.status)}</Text>
        </View>
      </Pressable>

      <View style={{ width, height }}>
        <FlatList
          data={media}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Pressable onPress={open} style={{ width, height }}>
              <ListingImage uri={item ?? post.video?.thumbnailUrl} id={post.id} />
            </Pressable>
          )}
        />
        {post.video && (
          <Pressable style={styles.tourPill} onPress={() => router.push({ pathname: '/tours', params: { start: post.id } })}>
            <Icon name="play" size={14} color={colors.white} />
            <Text style={styles.tourText}>Video tour</Text>
          </Pressable>
        )}
        {media.length > 1 && (
          <View style={styles.dots}>
            {media.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable hitSlop={10} onPress={toggleLike} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
          <Icon name={liked ? 'heartFill' : 'heart'} size={26} color={liked ? colors.alert : colors.ink} />
        </Pressable>
        <Pressable hitSlop={10} onPress={open} accessibilityLabel="Comments">
          <Icon name="comment" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={10} onPress={toggleSave} accessibilityLabel={saved ? 'Remove from saved' : 'Save'}>
          <Icon name={saved ? 'bookmarkFill' : 'bookmark'} size={25} color={saved ? colors.brand : colors.ink} />
        </Pressable>
      </View>

      <Pressable style={styles.body} onPress={open}>
        {likes > 0 && <Text style={styles.likes}>{likes} {likes === 1 ? 'like' : 'likes'}</Text>}
        <Text style={styles.price}>{priceText(post)}</Text>
        <Text style={styles.facts}>{factsLine(post)}</Text>
        <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
        {post.comment_count > 0 && (
          <Text style={styles.more}>View {post.comment_count === 1 ? '1 comment' : `all ${post.comment_count} comments`}</Text>
        )}
        {post.recent_comments.slice(-2).map(c => (
          <Text key={c.id} style={styles.comment} numberOfLines={1}>
            <Text style={styles.commentName}>{c.name} </Text>
            {c.body}
          </Text>
        ))}
        <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
      </Pressable>
    </View>
  );
}

export const PostCard = memo(PostCardInner);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  seller: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  place: { color: colors.muted, fontSize: 12.5 },
  badge: { backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: colors.brand, fontWeight: '700', fontSize: 11.5 },
  badgeAlt: { backgroundColor: '#fde8ec' },
  badgeAltText: { color: colors.alert },
  tourPill: {
    position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  tourText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { backgroundColor: colors.white },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 14, paddingTop: 10 },
  body: { paddingHorizontal: 14, paddingTop: 8, gap: 3 },
  likes: { color: colors.ink, fontWeight: '700', fontSize: 13.5 },
  price: { color: colors.ink, fontWeight: '800', fontSize: 19, marginTop: 2 },
  facts: { color: colors.muted, fontSize: 13.5 },
  title: { color: colors.ink, fontSize: 14.5, marginTop: 2 },
  more: { color: colors.muted, fontSize: 13.5, marginTop: 4 },
  comment: { color: colors.ink, fontSize: 13.5 },
  commentName: { fontWeight: '700' },
  time: { color: colors.muted, fontSize: 11.5, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
