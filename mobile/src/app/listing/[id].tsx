import { Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { ListingImage } from '@/components/ListingImage';
import { api, type Comment, type ListingDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fullAddress, priceText, statusLabel, timeAgo, typeLabel } from '@/lib/format';
import { colors, radius, serif } from '@/lib/theme';
import { useRequireLogin } from '@/lib/useRequireLogin';

function Fact({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={22} color={colors.brand} />
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function Tour({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => {
    p.loop = true;
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls fullscreenOptions={{ enable: true }} />;
}

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const requireLogin = useRequireLogin();
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.listing(id).then(setListing).catch(e => setError(e.message));
    api.comments(id).then(setComments).catch(() => {});
  }, [id]);

  // Whether it's already saved (only possible once signed in).
  useEffect(() => {
    if (user) api.saved.list().then(list => setSaved(list.some(l => l.id === id))).catch(() => {});
  }, [id, user]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>This home isn’t available</Text>
        <Text style={styles.errText}>{error}</Text>
      </View>
    );
  }
  if (!listing) return <ActivityIndicator style={{ flex: 1 }} color={colors.brand} />;

  const heroH = Math.round(width * 0.95);
  const media: ({ kind: 'video'; url: string } | { kind: 'image'; url: string | null })[] = [
    ...(listing.video ? [{ kind: 'video' as const, url: listing.video.url }] : []),
    ...listing.images.map(i => ({ kind: 'image' as const, url: i.url })),
  ];
  if (media.length === 0) media.push({ kind: 'image', url: null });

  function toggleSave() {
    requireLogin(() => {
      const next = !saved;
      setSaved(next);
      (next ? api.saved.save(id) : api.saved.unsave(id)).catch(() => setSaved(!next));
    });
  }

  function postComment() {
    const body = draft.trim();
    if (!body) return;
    requireLogin(async () => {
      setPosting(true);
      try {
        const c = await api.comment(id, body);
        setComments(list => [...list, c]);
        setDraft('');
      } catch {
        // leave the draft so they can retry
      } finally {
        setPosting(false);
      }
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: listing.suburb || 'Home' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <View style={{ width, height: heroH, backgroundColor: colors.bgAlt }}>
          <FlatList
            data={media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height: heroH }}>
                {item.kind === 'video' ? <Tour url={item.url} /> : <ListingImage uri={item.url} id={listing.id} />}
              </View>
            )}
          />
          {media.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{page + 1} / {media.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{statusLabel(listing.status)}</Text></View>
            <Text style={styles.type}>{typeLabel(listing.property_type)}</Text>
          </View>
          <Text style={styles.price}>{priceText(listing)}</Text>
          <Text style={styles.address}>{fullAddress(listing)}</Text>

          <View style={styles.facts}>
            {!!listing.beds && <Fact icon="bed" value={String(listing.beds)} label="Beds" />}
            {!!listing.baths && <Fact icon="bath" value={String(listing.baths)} label="Baths" />}
            {!!listing.cars && <Fact icon="car" value={String(listing.cars)} label="Cars" />}
            {!!listing.land_size && <Fact icon="land" value={`${listing.land_size.toLocaleString('en-AU')}`} label="m² land" />}
          </View>

          <Text style={styles.h2}>{listing.title}</Text>
          {!!listing.description && <Text style={styles.desc}>{listing.description}</Text>}

          {listing.features.length > 0 && (
            <>
              <Text style={styles.h3}>Features</Text>
              <View style={styles.chips}>
                {listing.features.map(f => (
                  <View key={f} style={styles.chip}><Text style={styles.chipText}>{f}</Text></View>
                ))}
              </View>
            </>
          )}

          <View style={styles.seller}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{listing.seller_name[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerLabel}>Sold privately by</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.sellerName}>{listing.seller_name}</Text>
                {listing.seller_verified && <Icon name="check" size={15} color={colors.brand} />}
              </View>
              {listing.seller_verified && <Text style={styles.sellerNote}>Identity verified · contract checked by a solicitor</Text>}
            </View>
          </View>

          <Text style={styles.h3}>Comments{comments.length ? ` (${comments.length})` : ''}</Text>
          {comments.length === 0 && <Text style={styles.muted}>No comments yet. Ask the owner a question.</Text>}
          {comments.map(c => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentText}><Text style={{ fontWeight: '700' }}>{c.name} </Text>{c.body}</Text>
              <Text style={styles.commentTime}>{timeAgo(c.created_at, true)}</Text>
            </View>
          ))}
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder="Add a comment…"
              placeholderTextColor={colors.muted}
              value={draft}
              onChangeText={setDraft}
              maxLength={500}
              multiline
            />
            <Pressable onPress={postComment} disabled={posting || !draft.trim()} hitSlop={8}>
              <Text style={[styles.postBtn, (!draft.trim() || posting) && { opacity: 0.4 }]}>Post</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barPrice}>{priceText(listing)}</Text>
          <Text style={styles.barPlace} numberOfLines={1}>{listing.suburb}</Text>
        </View>
        <Pressable style={[styles.saveBtn, saved && styles.saveBtnOn]} onPress={toggleSave} accessibilityLabel={saved ? 'Remove from saved' : 'Save'}>
          <Icon name={saved ? 'bookmarkFill' : 'bookmark'} size={20} color={saved ? colors.white : colors.brand} />
          <Text style={[styles.saveText, saved && { color: colors.white }]}>{saved ? 'Saved' : 'Save'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  errTitle: { fontSize: 19, fontWeight: '700', color: colors.ink },
  errText: { color: colors.muted, textAlign: 'center' },
  counter: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: colors.white, fontWeight: '700', fontSize: 12.5 },
  body: { padding: 18, gap: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: colors.brand, fontWeight: '700', fontSize: 12 },
  type: { color: colors.muted, fontSize: 13.5 },
  price: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 6 },
  address: { fontSize: 15.5, color: colors.ink },
  facts: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  fact: { flex: 1, alignItems: 'center', backgroundColor: colors.bgAlt, borderRadius: radius.md, paddingVertical: 12, gap: 2 },
  factValue: { fontSize: 17, fontWeight: '800', color: colors.ink },
  factLabel: { fontSize: 12, color: colors.muted },
  h2: { fontFamily: serif, fontSize: 22, color: colors.ink, marginTop: 4 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 18, marginBottom: 4 },
  desc: { fontSize: 15.5, lineHeight: 23, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.brandDark, fontSize: 13.5, fontWeight: '600' },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sellerLabel: { fontSize: 12.5, color: colors.muted },
  sellerName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sellerNote: { fontSize: 12.5, color: colors.brand, marginTop: 2 },
  muted: { color: colors.muted, fontSize: 14.5 },
  comment: { paddingVertical: 6, gap: 2 },
  commentText: { fontSize: 14.5, color: colors.ink, lineHeight: 20 },
  commentTime: { fontSize: 12, color: colors.muted },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  composerInput: { flex: 1, fontSize: 15, color: colors.ink, maxHeight: 100 },
  postBtn: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  barPrice: { fontSize: 17, fontWeight: '800', color: colors.ink },
  barPlace: { fontSize: 13, color: colors.muted },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 18, height: 46 },
  saveBtnOn: { backgroundColor: colors.brand },
  saveText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
});
