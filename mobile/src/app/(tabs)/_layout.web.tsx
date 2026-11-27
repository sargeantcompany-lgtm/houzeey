import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/Icon';
import { colors } from '@/lib/theme';
import type { ColorValue } from 'react-native';

// Browser preview only: a bottom tab bar drawn in JavaScript (phones use the native one in _layout.tsx).
const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} size={22} color={color} />,
});

export default function WebTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted }}>
      <Tabs.Screen name="index" options={tab('Home', 'house')} />
      <Tabs.Screen name="tours" options={tab('Tours', 'play')} />
      <Tabs.Screen name="sell" options={tab('Sell', 'house')} />
      <Tabs.Screen name="saved" options={tab('Saved', 'bookmark')} />
      <Tabs.Screen name="account" options={tab('Account', 'person')} />
    </Tabs>
  );
}
