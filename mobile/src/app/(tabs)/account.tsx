import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/Form';
import { Icon, type IconName } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { colors, radius, serif } from '@/lib/theme';

const SITE = 'https://www.houzeey.com';

function Row({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgAlt }]} onPress={onPress} accessibilityRole="button">
      <Icon name={icon} size={20} color={danger ? '#dc2626' : colors.brand} />
      <Text style={[styles.rowText, danger && { color: '#dc2626' }]}>{label}</Text>
      <Icon name="chevron" size={14} color={colors.muted} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const legal = (
    <View style={styles.group}>
      <Row icon="doc" label="Terms of Service" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms`)} />
      <Row icon="lock" label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} />
      <Row icon="message" label="Help & support" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/support`)} />
    </View>
  );

  function confirmDelete() {
    if (!password) return setError('Enter your password to confirm.');
    Alert.alert(
      'Delete your account?',
      'Your account, listings, saved homes and messages will be removed. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError('');
            try {
              await deleteAccount(password);
              setDeleting(false);
              setPassword('');
              Alert.alert('Account deleted', 'Your Houzeey account has been deleted.');
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: colors.bgAlt }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Account</Text>

        {!user ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Buy and sell homes privately</Text>
              <Text style={styles.cardText}>Save homes, like and comment on listings, and message owners directly.</Text>
              <Button title="Log in" onPress={() => router.push('/login')} />
              <Button title="Create an account" variant="outline" onPress={() => router.push('/register')} />
            </View>
            {legal}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.profile}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                    {user.verified && <Icon name="check" size={16} color={colors.brand} />}
                  </View>
                  <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
                  <Text style={styles.role}>{user.role === 'seller' ? 'Seller' : 'Buyer'}{user.verified ? ' · ID verified' : ''}</Text>
                </View>
              </View>
            </View>

            <View style={styles.group}>
              <Row icon="bookmark" label="Saved homes" onPress={() => router.navigate('/saved')} />
            </View>
            {legal}
            <View style={styles.group}>
              <Row icon="logout" label="Log out" onPress={logout} />
              <Row icon="trash" label="Delete account" danger onPress={() => setDeleting(d => !d)} />
            </View>

            {deleting && (
              <View style={styles.card}>
                <Text style={[styles.cardTitle, { color: '#dc2626' }]}>Delete account</Text>
                <Text style={styles.cardText}>
                  This permanently deletes your account, listings, saved homes and messages. Records of offers or settlements already under way are kept without your personal details.
                </Text>
                <ErrorText>{error}</ErrorText>
                <Field label="Enter your password to confirm" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
                <Button title="Delete my account" variant="danger" onPress={confirmDelete} loading={busy} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: serif, fontSize: 30, color: colors.ink, paddingHorizontal: 18, marginBottom: 14 },
  card: { backgroundColor: colors.bg, marginHorizontal: 16, marginBottom: 16, borderRadius: radius.lg, padding: 18, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  cardText: { fontSize: 14.5, color: colors.muted, lineHeight: 20 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  email: { fontSize: 14, color: colors.muted },
  role: { fontSize: 13, color: colors.brand, fontWeight: '600', marginTop: 2 },
  group: { backgroundColor: colors.bg, marginHorizontal: 16, marginBottom: 16, borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowText: { flex: 1, fontSize: 15.5, color: colors.ink },
});
