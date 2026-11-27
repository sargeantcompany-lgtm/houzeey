import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/Form';
import { api } from '@/lib/api';
import { authStyles as shared } from '@/components/authStyles';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email) return setError('Enter your email.');
    setBusy(true);
    setError('');
    try {
      await api.auth.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={shared.wrap} keyboardShouldPersistTaps="handled">
      <View style={shared.head}>
        <Text style={shared.title}>Reset your password</Text>
        <Text style={shared.sub}>
          {sent ? 'If an account exists for that email, a reset link is on its way. Check your inbox.' : 'We’ll email you a link to choose a new password.'}
        </Text>
      </View>
      {!sent && (
        <>
          <ErrorText>{error}</ErrorText>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Button title="Send reset link" onPress={submit} loading={busy} />
        </>
      )}
    </ScrollView>
  );
}
