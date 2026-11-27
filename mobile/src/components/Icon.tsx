import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

// One icon set for the whole app: Apple SF Symbols on iPhone, Google Material Symbols on Android.
const ICONS = {
  heart: { ios: 'heart', android: 'favorite_border' },
  heartFill: { ios: 'heart.fill', android: 'favorite' },
  bookmark: { ios: 'bookmark', android: 'bookmark_border' },
  bookmarkFill: { ios: 'bookmark.fill', android: 'bookmark' },
  comment: { ios: 'bubble.right', android: 'chat_bubble_outline' },
  bed: { ios: 'bed.double', android: 'bed' },
  bath: { ios: 'bathtub', android: 'bathtub' },
  car: { ios: 'car', android: 'directions_car' },
  land: { ios: 'square.dashed', android: 'crop_free' },
  search: { ios: 'magnifyingglass', android: 'search' },
  close: { ios: 'xmark', android: 'close' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  check: { ios: 'checkmark.seal.fill', android: 'verified' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  speaker: { ios: 'speaker.wave.2.fill', android: 'volume_up' },
  speakerOff: { ios: 'speaker.slash.fill', android: 'volume_off' },
  message: { ios: 'paperplane', android: 'send' },
  house: { ios: 'house', android: 'home' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on' },
  person: { ios: 'person.crop.circle', android: 'account_circle' },
  doc: { ios: 'doc.text', android: 'description' },
  lock: { ios: 'lock', android: 'lock' },
  trash: { ios: 'trash', android: 'delete' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: ColorValue }) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={size}
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
