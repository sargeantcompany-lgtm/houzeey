import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready } = useAuth();
  // Keep the splash screen up until we know whether the user is signed in.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ title: '' }} />
      <Stack.Screen name="login" options={{ presentation: 'modal', title: 'Log in' }} />
      <Stack.Screen name="register" options={{ presentation: 'modal', title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ presentation: 'modal', title: 'Forgot password' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}
