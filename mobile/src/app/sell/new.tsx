import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { money, typeLabel } from '@/lib/format';
import { appendFile, MAX_PHOTOS, pickPhotos, pickVideo, recordVideo, takePhoto, uploadVideo, type Photo, type Video } from '@/lib/media';
import { colors, radius, serif } from '@/lib/theme';

const STEPS = ['Address & details', 'Photos & video', 'Price & description', 'Your solicitor', 'Review'];
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const TYPES = ['house', 'apartment', 'townhouse', 'unit', 'land', 'rural'];
const FEATURES = ['Air conditioning', 'Built-in wardrobes', 'Dishwasher', 'Solar panels', 'Swimming pool', 'Garden', 'Balcony', 'Study', 'Ensuite', 'Waterfront'];
const PRICE_MODES = [
  { value: 'exact', label: 'Asking price' },
  { value: 'range', label: 'Price range' },
  { value: 'contact', label: 'Contact owner' },
] as const;

type Form = {
  address: string; suburb: string; state: string; postcode: string; propertyType: string;
  beds: number; baths: number; cars: number; size: string; headline: string; description: string;
  price: string; priceMax: string; priceDisplay: 'exact' | 'range' | 'contact'; features: string[];
  solicitor_name: string; solicitor_firm: string; solicitor_email: string; solicitor_phone: string;
  solicitor_registration_number: string; solicitor_state: string; confirm: boolean;
};

function Chips<T extends string>({ options, value, onChange, label }: { options: readonly { value: T; label: string }[]; value: T | T[]; onChange: (v: T) => void; label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.chips}>
        {options.map(o => {
          const on = Array.isArray(value) ? value.includes(o.value) : value === o.value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, on && styles.chipOn]} accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && { color: colors.white }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterRow}>
        <Pressable style={styles.counterBtn} onPress={() => onChange(Math.max(0, value - 1))} accessibilityLabel={`Fewer ${label}`}><Text style={styles.counterSign}>−</Text></Pressable>
        <Text style={styles.counterValue}>{value}</Text>
        <Pressable style={styles.counterBtn} onPress={() => onChange(Math.min(20, value + 1))} accessibilityLabel={`More ${label}`}><Text style={styles.counterSign}>+</Text></Pressable>
      </View>
    </View>
  );
}

export default function NewListingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    address: '', suburb: '', state: 'NSW', postcode: '', propertyType: 'house',
    beds: 3, baths: 2, cars: 1, size: '', headline: '', description: '',
    price: '', priceMax: '', priceDisplay: 'exact', features: [],
    solicitor_name: '', solicitor_firm: '', solicitor_email: '', solicitor_phone: '',
    solicitor_registration_number: '', solicitor_state: 'NSW', confirm: false,
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [listingId, setListingId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setError('');
  };
  const noRooms = form.propertyType === 'land' || form.propertyType === 'rural';
  const autoTitle = `${form.beds && !noRooms ? `${form.beds} bedroom ` : ''}${typeLabel(form.propertyType).toLowerCase()} in ${form.suburb || 'your suburb'}`;
  const priceLine = form.priceDisplay === 'contact' ? 'Contact owner'
    : form.priceDisplay === 'range' ? `${money(form.price)} – ${money(form.priceMax)}` : money(form.price);

  function validate() {
    if (step === 0 && (!form.address.trim() || !form.suburb.trim() || !/^\d{4}$/.test(form.postcode.trim()))) return 'Enter the street address, suburb and a 4-digit postcode.';
    if (step === 2) {
      if (form.priceDisplay !== 'contact' && !(Number(form.price) > 0)) return 'Enter an asking price, or choose “Contact owner”.';
      if (form.priceDisplay === 'range' && !(Number(form.priceMax) > Number(form.price))) return 'The top of your price range must be higher than the bottom.';
      if (form.description.trim().length < 40) return 'Describe your home in at least a couple of sentences (40 characters).';
    }
    if (step === 3 && (!form.solicitor_name.trim() || !form.solicitor_firm.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.solicitor_email.trim()) || !form.solicitor_registration_number.trim())) {
      return 'Add your solicitor or conveyancer’s name, firm, work email and registration number.';
    }
    if (step === 4 && !form.confirm) return 'Confirm that you own the property or are authorised to sell it.';
    return '';
  }

  function next() {
    const problem = validate();
    if (problem) return setError(problem);
    setError('');
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else submit();
  }

  async function addPhotos(source: 'camera' | 'library') {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return setError(`You can add up to ${MAX_PHOTOS} photos.`);
    const added = source === 'camera' ? [await takePhoto()].filter((p): p is Photo => !!p) : await pickPhotos(room);
    setPhotos(p => [...p, ...added].slice(0, MAX_PHOTOS));
    setError('');
  }

  async function chooseVideo(source: 'camera' | 'library') {
    const v = source === 'camera' ? await recordVideo() : await pickVideo();
    if (typeof v === 'string') return setError(v);
    if (v) {
      setVideo(v);
      setError('');
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    let id = listingId;
    try {
      if (!id) {
        setProgress('Sending your listing…');
        const fd = new FormData();
        fd.append('type', 'sale');
        fd.append('property_type', form.propertyType);
        fd.append('title', (form.headline.trim() || autoTitle).slice(0, 120));
        fd.append('address', form.address.trim());
        fd.append('suburb', form.suburb.trim());
        fd.append('state', form.state);
        fd.append('postcode', form.postcode.trim());
        if (!noRooms) {
          fd.append('beds', String(form.beds));
          fd.append('baths', String(form.baths));
        }
        fd.append('cars', String(form.cars));
        if (form.size) fd.append('land_size', form.size);
        fd.append('description', form.description.trim());
        fd.append('price', form.priceDisplay === 'contact' && !form.price ? '0' : form.price);
        fd.append('price_display', form.priceDisplay);
        if (form.priceDisplay === 'range') fd.append('price_max', form.priceMax);
        form.features.forEach(f => fd.append('features', f));
        for (const key of ['solicitor_name', 'solicitor_firm', 'solicitor_email', 'solicitor_phone', 'solicitor_registration_number', 'solicitor_state'] as const) {
          fd.append(key, form[key].trim());
        }
        for (const p of photos) await appendFile(fd, 'images', p);
        const created = await api.sell.create(fd);
        id = created.id;
        setListingId(id);
      }
      if (video) {
        setProgress('Preparing video upload…');
        const up = await api.sell.videoUploadUrl(id, video.type, video.size);
        await uploadVideo(video, up.uploadUrl, up.headers || {}, pct => setProgress(`Uploading video… ${pct}%`));
        setProgress('Starting video processing…');
        await api.sell.videoComplete(up.videoId);
      }
      setFinished(true);
    } catch (e) {
      const msg = (e as Error).message;
      setError(id ? `Your listing was sent for solicitor review, but the video upload didn’t finish (${msg}). Tap “Try video again”.` : msg);
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  if (finished) {
    return (
      <View style={[styles.done, { paddingBottom: insets.bottom + 20 }]}>
        <Stack.Screen options={{ title: 'Listing sent' }} />
        <Icon name="check" size={52} color={colors.brand} />
        <Text style={styles.h1}>Sent to your solicitor</Text>
        <Text style={styles.text}>
          We’ve emailed {form.solicitor_name.trim() || 'your solicitor'} to review the details. Your home goes live as soon as they approve it.
          {video ? ' Your video tour is being prepared and will appear shortly.' : ''}
        </Text>
        <View style={{ alignSelf: 'stretch' }}><Button title="Done" onPress={() => router.back()} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: STEPS[step] }} />
      <View style={styles.progress}>
        {STEPS.map((s, i) => <View key={s} style={[styles.bar, i <= step && styles.barOn]} />)}
      </View>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>

        {step === 0 && (
          <>
            <Field label="Street address" value={form.address} onChangeText={v => set('address', v)} placeholder="e.g. 27 Wattle Ave" autoComplete="street-address" textContentType="streetAddressLine1" />
            <Field label="Suburb" value={form.suburb} onChangeText={v => set('suburb', v)} textContentType="addressCity" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Postcode" value={form.postcode} onChangeText={v => set('postcode', v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" textContentType="postalCode" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Land size (m²)" value={form.size} onChangeText={v => set('size', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Optional" />
              </View>
            </View>
            <Chips label="State" options={STATES.map(s => ({ value: s, label: s }))} value={form.state} onChange={v => set('state', v)} />
            <Chips label="Property type" options={TYPES.map(t => ({ value: t, label: typeLabel(t) }))} value={form.propertyType} onChange={v => set('propertyType', v)} />
            <View style={styles.counters}>
              {!noRooms && <Counter label="Beds" value={form.beds} onChange={n => set('beds', n)} />}
              {!noRooms && <Counter label="Baths" value={form.baths} onChange={n => set('baths', n)} />}
              <Counter label="Cars" value={form.cars} onChange={n => set('cars', n)} />
            </View>
            <Chips label="Features" options={FEATURES.map(f => ({ value: f, label: f }))} value={form.features}
              onChange={f => set('features', form.features.includes(f) ? form.features.filter(x => x !== f) : [...form.features, f])} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.text}>Bright photos sell homes. The first photo is your cover. Long-press a photo to make it the cover.</Text>
            <View style={styles.grid}>
              {photos.map((p, i) => (
                <Pressable key={p.uri + i} style={styles.tile} onLongPress={() => setPhotos(list => [list[i], ...list.filter((_, k) => k !== i)])}>
                  <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {i === 0 && <View style={styles.cover}><Text style={styles.coverText}>Cover</Text></View>}
                  <Pressable style={styles.remove} hitSlop={8} onPress={() => setPhotos(list => list.filter((_, k) => k !== i))} accessibilityLabel="Remove photo">
                    <Icon name="close" size={13} color={colors.white} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
            <View style={styles.twoButtons}>
              <View style={{ flex: 1 }}><Button title="Take photo" variant="outline" onPress={() => addPhotos('camera')} /></View>
              <View style={{ flex: 1 }}><Button title="Choose photos" onPress={() => addPhotos('library')} /></View>
            </View>
            <Text style={styles.hint}>{photos.length} of {MAX_PHOTOS} photos</Text>

            <Text style={[styles.label, { marginTop: 14 }]}>Video tour (recommended)</Text>
            <Text style={styles.text}>Film a short vertical walk-through (under two minutes). It plays like a reel in the feed and in Tours.</Text>
            {video ? (
              <View style={styles.videoRow}>
                <Icon name="play" size={22} color={colors.brand} />
                <Text style={{ flex: 1, color: colors.ink, fontWeight: '600' }}>Video added · {Math.round(video.size / 1024 / 1024)} MB</Text>
                <Pressable onPress={() => setVideo(null)} hitSlop={8}><Text style={{ color: colors.alert, fontWeight: '700' }}>Remove</Text></Pressable>
              </View>
            ) : (
              <View style={styles.twoButtons}>
                <View style={{ flex: 1 }}><Button title="Record video" variant="outline" onPress={() => chooseVideo('camera')} /></View>
                <View style={{ flex: 1 }}><Button title="Choose video" variant="outline" onPress={() => chooseVideo('library')} /></View>
              </View>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Chips label="How to show the price" options={PRICE_MODES} value={form.priceDisplay} onChange={v => set('priceDisplay', v)} />
            {form.priceDisplay !== 'contact' && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label={form.priceDisplay === 'range' ? 'From ($)' : 'Asking price ($)'} value={form.price} onChangeText={v => set('price', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="850000" />
                </View>
                {form.priceDisplay === 'range' && (
                  <View style={{ flex: 1 }}>
                    <Field label="To ($)" value={form.priceMax} onChangeText={v => set('priceMax', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="900000" />
                  </View>
                )}
              </View>
            )}
            <Field label="Headline (optional)" value={form.headline} onChangeText={v => set('headline', v)} placeholder={autoTitle} maxLength={120} />
            <Field
              label="Describe your home"
              value={form.description}
              onChangeText={v => set('description', v)}
              multiline
              style={styles.textarea}
              placeholder="What makes it special? The street, the light, the walk to the station, recent updates…"
              maxLength={5000}
            />
            <Text style={styles.hint}>{form.description.trim().length < 40 ? `${40 - form.description.trim().length} more characters needed` : 'Looks good'}</Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.text}>Your solicitor or conveyancer reviews the listing and confirms they’ve done identity and AML checks before it goes live. We’ll email them a secure link.</Text>
            <Field label="Solicitor or conveyancer name" value={form.solicitor_name} onChangeText={v => set('solicitor_name', v)} />
            <Field label="Firm" value={form.solicitor_firm} onChangeText={v => set('solicitor_firm', v)} />
            <Field label="Work email" value={form.solicitor_email} onChangeText={v => set('solicitor_email', v)} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Phone (optional)" value={form.solicitor_phone} onChangeText={v => set('solicitor_phone', v)} keyboardType="phone-pad" />
            <Field label="Practising certificate or licence number" value={form.solicitor_registration_number} onChangeText={v => set('solicitor_registration_number', v)} />
            <Chips label="State they practise in" options={STATES.map(s => ({ value: s, label: s }))} value={form.solicitor_state} onChange={v => set('solicitor_state', v)} />
          </>
        )}

        {step === 4 && (
          <>
            <View style={styles.review}>
              <View style={styles.reviewImg}>
                {photos[0] ? <Image source={{ uri: photos[0].uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="house" size={34} color={colors.white} />}
              </View>
              <Text style={styles.reviewPrice}>{priceLine}</Text>
              <Text style={styles.reviewTitle}>{form.headline.trim() || autoTitle}</Text>
              <Text style={styles.text}>{form.address}, {form.suburb} {form.state} {form.postcode}</Text>
              <Text style={styles.hint}>
                {photos.length} photo{photos.length === 1 ? '' : 's'}{video ? ' · video tour' : ''} · reviewed by {form.solicitor_name || 'your solicitor'}
              </Text>
            </View>
            <View style={styles.confirm}>
              <Switch value={form.confirm} onValueChange={v => set('confirm', v)} trackColor={{ true: colors.brand }} />
              <Text style={styles.confirmText}>I own this property or am authorised to sell it, and the details are accurate.</Text>
            </View>
          </>
        )}

        <ErrorText>{error}</ErrorText>
        {!!progress && <Text style={styles.progressText}>{progress}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {step > 0 && !listingId && (
          <View style={{ flex: 1 }}><Button title="Back" variant="outline" onPress={() => { setError(''); setStep(s => s - 1); }} disabled={busy} /></View>
        )}
        <View style={{ flex: 2 }}>
          <Button
            title={listingId ? 'Try video again' : step === STEPS.length - 1 ? 'Send for solicitor review' : 'Continue'}
            onPress={listingId ? submit : next}
            loading={busy}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 18, paddingTop: 10 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  barOn: { backgroundColor: colors.brand },
  wrap: { padding: 18, gap: 14, paddingBottom: 30 },
  stepCount: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  h1: { fontFamily: serif, fontSize: 26, color: colors.ink, textAlign: 'center' },
  text: { fontSize: 14.5, color: colors.muted, lineHeight: 20 },
  hint: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  counters: { flexDirection: 'row', gap: 10 },
  counter: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 6 },
  counterLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  counterSign: { fontSize: 20, color: colors.brand, fontWeight: '700', lineHeight: 22 },
  counterValue: { fontSize: 18, fontWeight: '800', color: colors.ink, minWidth: 18, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.bgAlt },
  cover: { position: 'absolute', left: 6, bottom: 6, backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  coverText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  remove: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 5 },
  twoButtons: { flexDirection: 'row', gap: 10 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  textarea: { height: 150, paddingTop: 12, textAlignVertical: 'top' },
  review: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 14, gap: 6 },
  reviewImg: { height: 180, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  reviewPrice: { fontSize: 22, fontWeight: '800', color: colors.ink },
  reviewTitle: { fontSize: 16, color: colors.ink, fontWeight: '600' },
  confirm: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  confirmText: { flex: 1, fontSize: 14.5, color: colors.ink, lineHeight: 20 },
  progressText: { fontSize: 14.5, color: colors.brand, fontWeight: '700', textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14, backgroundColor: colors.bg },
});
