import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from './auth';

// Wraps an action that needs an account: runs it when signed in, otherwise opens Login.
export function useRequireLogin() {
  const { user } = useAuth();
  return useCallback(
    (action: () => void) => {
      if (user) action();
      else router.push('/login');
    },
    [user],
  );
}
