import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { ListingImage } from '@/components/ListingImage';
import { api, type IdentityCheck, type MyListing } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { placeLine, priceText } from '@/lib/format';
import { colors, radius, serif } from '@/lib/theme';

// Where a listing is up to, in plain words.
function listingStage(l: MyListing): { label: string; tone: 'wait' | 'live' | 'fix' | 'done' } {
  if (l.status === 'sold') return { label: 'Sold', tone: 'done' };
  if (l.status === 'withdrawn') return { label: 'Withdrawn', tone: 'done' };
  if (l.status === 'needs_changes' || l.solicitor_review_status === 'rejected') return { label: 'Changes requested by your solicitor', tone: 'fix' };
  if (l.status === 'pending_review' || l.solicitor_review_status === 'pending') return { label: 'Waiting for your solicitor to review', tone: 'wait' };
  if (l.status === 'under_offer') return { label: 'Live · Under offer', tone: 'live' };
  return { label: 'Live', tone: 'live' };
}

const TONE = {
  wait: { bg: '#fff7e6', fg: '#a15c00' },
  live: { bg: colors.brandSoft, fg: colors.brand },
  fix: { bg: '#fdecee', fg: colors.alert },
  done: { bg: colors.bgAlt, fg: colors.muted },
};

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState<MyListing[] | null>(null);
  const [idCheck, setIdCheck] = useState<IdentityCheck | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await refreshUser();
    const [mine, id] = await Promise.all([api.sell.mine().catch(() => []), api.identity.me().catch(() => null)]);
    setListings(mine);
    setIdCheck(id);
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [user?.id]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.h1}>Sell your home</Text>
      <Text style={styles.sub}>Free to list. No agent, no commission. Your solicitor checks the details before it goes live.</Text>
    </View>
  );

  if (!user) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}>
        {header}
        <Steps />
        <View style={styles.pad}><Button title="Log in to start" onPress={() => router.push('/login')} /></View>
      </ScrollView>
    );
  }

  const verified = user.verified;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brand} />}>
      {header}

      {!verified ? (
        <View style={styles.card}>
          <Icon name="person" size={30} color={colors.brand} />
          {idCheck?.status === 'pending' ? (
            <>
              <Text style={styles.cardTitle}>We’re checking your ID</Text>
              <Text style={styles.cardText}>This usually takes 1–2 business days. You can start listing as soon as it’s approved.</Text>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{idCheck?.status === 'rejected' ? 'Your ID wasn’t accepted' : 'First, verify your identity'}</Text>
              <Text style={styles.cardText}>
                {idCheck?.status === 'rejected'
                  ? `Please try again with a clear photo.${idCheck.notes ? ` Reason: ${idCheck.notes}` : ''}`
                  : 'Every seller on Houzeey verifies their identity before listing. It takes a few minutes and keeps buyers safe from fake listings.'}
              </Text>
              <Button title="Verify my identity" onPress={() => router.push('/verify-identity')} />
            </>
          )}
        </View>
      ) : (
        <View style={styles.pad}>
          <Button title="List a property" onPress={() => router.push('/sell/new')} />
        </View>
      )}

      {listings === null ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={colors.brand} />
      ) : listings.length > 0 ? (
        <>
          <Text style={styles.h2}>Your listings</Text>
          {listings.map(l => {
            const stage = listingStage(l);
            const tone = TONE[stage.tone];
            return (
              <Pressable key={l.id} style={styles.row} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}>
                <View style={styles.thumb}><ListingImage uri={l.primary_image} id={l.id} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.price}>{priceText(l)}</Text>
                  <Text style={styles.place} numberOfLines={1}>{l.address ? `${l.address}, ` : ''}{placeLine(l)}</Text>
                  <View style={[styles.stage, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.stageText, { color: tone.fg }]}>{stage.label}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      ) : verified ? null : (
        <Steps />
      )}
    </ScrollView>
  );
}

function Steps() {
  const steps = [
    ['Verify your identity', 'A quick ID check so buyers know you’re the real owner.'],
    ['Add photos and a video tour', 'Straight from your phone’s camera or photo library.'],
    ['Set your price', 'An exact price, a range, or “contact owner”.'],
    ['Your solicitor reviews it', 'They confirm the details, then your home goes live.'],
  ];
  return (
    <View style={styles.steps}>
      {steps.map(([t, d], i) => (
        <View key={t} style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{t}</Text>
            <Text style={styles.stepText}>{d}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingBottom: 16, gap: 6 },
  h1: { fontFamily: serif, fontSize: 30, color: colors.ink },
  sub: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  pad: { paddingHorizontal: 18, marginBottom: 8 },
  card: { marginHorizontal: 18, padding: 18, gap: 10, borderRadius: radius.lg, backgroundColor: colors.brandSoft },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  cardText: { fontSize: 14.5, color: colors.ink, lineHeight: 20 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink, paddingHorizontal: 18, marginTop: 22, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' },
  thumb: { width: 92, height: 80, borderRadius: radius.md, overflow: 'hidden' },
  price: { fontSize: 16.5, fontWeight: '800', color: colors.ink },
  place: { fontSize: 13.5, color: colors.muted },
  stage: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  stageText: { fontSize: 12, fontWeight: '700' },
  steps: { paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  step: { flexDirection: 'row', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: colors.white, fontWeight: '800' },
  stepTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  stepText: { fontSize: 14, color: colors.muted, lineHeight: 19 },
});
