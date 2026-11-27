import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/Form';
import { useAuth } from '@/lib/auth';
import { colors, radius } from '@/lib/theme';
import { authStyles as shared } from '@/components/authStyles';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name || !email || !password) return setError('Please fill in every field.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    setError('');
    try {
      await register({ name, email, password, role });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={shared.wrap} keyboardShouldPersistTaps="handled">
        <View style={shared.head}>
          <Text style={shared.title}>Create your account</Text>
          <Text style={shared.sub}>Buy or sell privately. No agents, no commission.</Text>
        </View>
        <ErrorText>{error}</ErrorText>
        <View style={styles.roles}>
          {(['buyer', 'seller'] as const).map(r => (
            <Pressable key={r} onPress={() => setRole(r)} style={[styles.role, role === r && styles.roleOn]} accessibilityRole="radio" accessibilityState={{ selected: role === r }}>
              <Text style={[styles.roleTitle, role === r && { color: colors.brand }]}>{r === 'buyer' ? 'I’m buying' : 'I’m selling'}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <Button title="Create account" onPress={submit} loading={busy} />
        <Text style={styles.legal}>
          By creating an account you agree to the Houzeey Terms of Service and Privacy Policy.
        </Text>
        <View style={shared.row}>
          <Text style={shared.sub}>Already have an account? </Text>
          <Link href="/login" replace style={shared.linkStrong}>Log in</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', gap: 10 },
  role: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  roleOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  roleTitle: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  legal: { fontSize: 12.5, color: colors.muted, textAlign: 'center' },
});
