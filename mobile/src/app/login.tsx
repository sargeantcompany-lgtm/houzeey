import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/Form';
import { Logo } from '@/components/Logo';
import { authStyles as styles } from '@/components/authStyles';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Logo size={36} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Log in to save homes, like posts and message owners.</Text>
        </View>
        <ErrorText>{error}</ErrorText>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
        <Button title="Log in" onPress={submit} loading={busy} />
        <Link href="/forgot-password" style={styles.link}>Forgot password?</Link>
        <View style={styles.row}>
          <Text style={styles.sub}>New to Houzeey? </Text>
          <Link href="/register" replace style={styles.linkStrong}>Create an account</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
