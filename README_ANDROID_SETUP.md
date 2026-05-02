# Navo Lite - Quick Android Setup

> Convert your Next.js PWA to a native Android app in 5 steps.

## Prerequisites

- Android Studio installed
- ImageMagick installed (for icons)
- Your app deployed to Vercel (or another host)

## Setup Steps

### 1. Configure Your Deployed URL

Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'https://your-app.vercel.app',  // ⬅️ YOUR URL HERE
}
```

### 2. Generate Android Resources

```bash
node scripts/setup-android-resources.js
```

### 3. Sync Capacitor

```bash
npx cap sync
```

### 4. Open Android Studio

```bash
npx cap open android
```

### 5. Build APK

In Android Studio:
1. Connect device or start emulator
2. Click Run (▶) button

Or via command line:
```bash
cd android
./gradlew assembleDebug
```

## Build Commands

| Command | Output |
|---------|--------|
| `npm run cap:build:debug` | Debug APK |
| `npm run cap:build:release` | Signed Release APK |
| `npm run cap:build:aab` | Play Store Bundle (AAB) |

## File Structure

```
├── capacitor.config.ts          # Main Capacitor config
├── android/                     # Android project
│   ├── app/
│   │   ├── build.gradle         # Build configuration
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── res/             # Icons, splash screens
│   └── build.gradle             # Project-level config
├── scripts/
│   └── setup-android-resources.js  # Icon generator
└── resources/README.md          # Resource guide
```

## Key Configuration Details

### App Identity
- **Package:** `com.navo.lite`
- **App Name:** `Navo Lite`
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 36 (Android 14)

### Remote Loading
- App loads from your deployed URL
- No static export required
- Works with Next.js dynamic routes

### Security
- HTTPS-only in production
- Auth endpoints not cached
- Cleartext disabled

## Troubleshooting

| Issue | Solution |
|-------|----------|
| White screen | Check URL in capacitor.config.ts |
| Network error | Ensure HTTPS, not HTTP |
| Icons missing | Run `node scripts/setup-android-resources.js` |
| Auth fails | Verify Supabase NetworkOnly caching |

See `CAPACITOR_ANDROID_GUIDE.md` for detailed troubleshooting.

## Next Steps

1. Test on real device with `adb install`
2. Create release keystore for signing
3. Build AAB for Play Store
4. Submit to Google Play Console

---

**Full Documentation:** `CAPACITOR_ANDROID_GUIDE.md` (40+ pages of detailed guides)
