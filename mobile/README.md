# Houzeey app (iPhone + Android)

A native React Native app built with Expo. It uses the same API as the website.

## Run it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On the computer: `cd mobile`, `npm install`, then `npx expo start`.
3. iPhone: open the Camera and scan the QR code. Android: scan it in Expo Go.
   The phone and computer must be on the same Wi-Fi.

The app talks to the live API by default. To use a local API instead:
`EXPO_PUBLIC_API_URL=http://<computer-ip>:3001 npx expo start`

## Checks

```
npx tsc --noEmit
npx eslint src
npx expo-doctor
```

## Screens so far

- Home: feed of homes for sale with photos, likes, comments, save, search
- Tours: full-screen vertical video tours (only the one on screen plays)
- Property page: photos/video, price, facts, features, seller, comments, save
- Saved homes
- Account: log in, create account, forgot password, log out, delete account
