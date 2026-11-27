import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { appendFile, pickPhotos, takePhoto, type Photo } from '@/lib/media';
import { colors, radius, serif } from '@/lib/theme';

const DOCS = [
  { value: 'drivers_licence', label: 'Driver’s licence' },
  { value: 'passport', label: 'Passport' },
  { value: 'medicare', label: 'Medicare card' },
  { value: 'national_id', label: 'Other photo ID' },
];

function PhotoSlot({ title, hint, photo, onCamera, onLibrary, onClear }: {
  title: string; hint: string; photo: Photo | null; onCamera: () => void; onLibrary?: () => void; onClear: () => void;
}) {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotTitle}>{title}</Text>
      <Text style={styles.slotHint}>{hint}</Text>
      {photo ? (
        <View>
          <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />
          <Pressable style={styles.clear} onPress={onClear} accessibilityLabel={`Remove ${title}`}>
            <Icon name="close" size={16} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.slotButtons}>
          <View style={{ flex: 1 }}><Button title="Take photo" onPress={onCamera} /></View>
          {onLibrary && <View style={{ flex: 1 }}><Button title="Choose photo" variant="outline" onPress={onLibrary} /></View>}
        </View>
      )}
    </View>
  );
}

export default function VerifyIdentityScreen() {
  const [docType, setDocType] = useState('drivers_licence');
  const [doc, setDoc] = useState<Photo | null>(null);
  const [selfie, setSelfie] = useState<Photo | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!doc) return setError('Add a photo of your ID.');
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('document_type', docType);
      await appendFile(form, 'document', doc);
      if (selfie) await appendFile(form, 'selfie', selfie);
      await api.identity.submit(form);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={styles.done}>
        <Icon name="check" size={48} color={colors.brand} />
        <Text style={styles.h1}>Thanks, we’ve got it</Text>
        <Text style={styles.text}>We’ll check your ID within 1–2 business days. You can list your home as soon as it’s approved.</Text>
        <View style={{ alignSelf: 'stretch' }}><Button title="Done" onPress={() => router.back()} /></View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Verify your identity</Text>
      <Text style={styles.text}>Buyers only see homes from verified owners. Your ID is stored securely and only seen by the Houzeey team.</Text>

      <Text style={styles.label}>Type of ID</Text>
      <View style={styles.chips}>
        {DOCS.map(d => (
          <Pressable key={d.value} onPress={() => setDocType(d.value)} style={[styles.chip, docType === d.value && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: docType === d.value }}>
            <Text style={[styles.chipText, docType === d.value && { color: colors.white }]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <PhotoSlot
        title="Photo of your ID"
        hint="The whole card in frame, in good light, with all text readable."
        photo={doc}
        onCamera={async () => setDoc((await takePhoto()) ?? doc)}
        onLibrary={async () => setDoc((await pickPhotos(1))[0] ?? doc)}
        onClear={() => setDoc(null)}
      />
      <PhotoSlot
        title="Selfie (recommended)"
        hint="A clear photo of your face so we can match it to your ID."
        photo={selfie}
        onCamera={async () => setSelfie((await takePhoto(true)) ?? selfie)}
        onClear={() => setSelfie(null)}
      />

      <ErrorText>{error}</ErrorText>
      <Button title="Submit for checking" onPress={submit} loading={busy} disabled={!doc} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 60 },
  h1: { fontFamily: serif, fontSize: 26, color: colors.ink },
  text: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  slot: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 14, gap: 8 },
  slotTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  slotHint: { fontSize: 13.5, color: colors.muted },
  slotButtons: { flexDirection: 'row', gap: 10 },
  preview: { width: '100%', height: 190, borderRadius: radius.md },
  clear: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 7 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
});
