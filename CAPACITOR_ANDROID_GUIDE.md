# Navo Lite - Capacitor Android Integration Guide

Complete guide to building Navo Lite as a native Android app using Capacitor.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Building the App](#building-the-app)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Play Store Deployment](#play-store-deployment)

---

## Overview

Navo Lite uses **Capacitor** to wrap the Next.js PWA into a native Android application.

### Key Features:
- Loads content from your live deployed URL (Vercel)
- Native Android app experience
- Offline support via PWA service worker
- Push notification support (optional)
- Optimized for low-end devices (minSdk: 24)

### Architecture:
```
┌─────────────────────────────────────┐
│         Navo Lite App               │
│  ┌──────────────────────────────┐   │
│  │     Android WebView          │   │
│  │  ┌────────────────────────┐  │   │
│  │  │   Your Live Website    │  │   │
│  │  │  (e.g., vercel.app)    │  │   │
│  │  └────────────────────────┘  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Prerequisites

### Required Software:
1. **Node.js 18+** (already installed for Next.js)
2. **Android Studio** (latest stable version)
   - Download: https://developer.android.com/studio
3. **Java 17** (bundled with Android Studio)
4. **ImageMagick** (for generating icons)
   - Windows: `choco install imagemagick`
   - macOS: `brew install imagemagick`
   - Linux: `sudo apt install imagemagick`

### Android Studio Setup:
1. Install Android Studio
2. During setup, install:
   - Android SDK Platform (API 24-36)
   - Android SDK Build-Tools
   - Android Emulator (optional, for testing)
3. Set environment variable:
   ```bash
   # Windows
   setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
   
   # Add to PATH
   %ANDROID_HOME%\platform-tools
   ```

---

## Installation

### 1. Install Capacitor Dependencies

Already done! Your `package.json` includes:
```json
{
  "dependencies": {
    "@capacitor/core": "^8.3.1",
    "@capacitor/android": "^8.3.1"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.3.1"
  }
}
```

### 2. Update Deployed URL

Edit `capacitor.config.ts`:
```typescript
server: {
  // ⚠️ REPLACE with your actual deployed URL
  url: 'https://your-app.vercel.app',
  cleartext: false,  // HTTPS only in production
}
```

### 3. Setup Android Resources

Generate icons and splash screen:
```bash
# Run the setup script
node scripts/setup-android-resources.js
```

This will:
- Create all required icon sizes (48px to 192px)
- Generate splash screens (2732x2732)
- Create colors.xml

### 4. Sync Capacitor

```bash
# Sync web assets with Android project
npx cap sync

# Or use the npm script
npm run cap:sync
```

### 5. Open in Android Studio

```bash
# Open Android Studio with the project
npx cap open android

# Or use the npm script
npm run cap:android
```

---

## Configuration

### Capacitor Configuration

**File:** `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: 'com.navo.lite',           // Unique app identifier
  appName: 'Navo Lite',             // Display name
  webDir: 'dist',                   // Build output directory
  
  server: {
    url: 'https://your-app.vercel.app',  // ⚠️ YOUR DEPLOYED URL
    cleartext: false,                     // HTTPS only
    androidScheme: 'https',
  },
  
  android: {
    allowMixedContent: false,
    captureInput: true,               // Handle back button
    backgroundColor: '#3b82f6',      // Brand color
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: true,
    },
  },
};
```

### Android Manifest

**File:** `android/app/src/main/AndroidManifest.xml`

Key configurations:
- Package: `com.navo.lite`
- Internet permission (required)
- Network state permission (for offline detection)
- Cleartext disabled (HTTPS only)

### Environment Variables

For release signing, set these environment variables:

```bash
# Windows PowerShell
$env:NAVO_KEYSTORE_PATH = "C:\path\to\navo-release.keystore"
$env:NAVO_KEYSTORE_PASSWORD = "your_keystore_password"
$env:NAVO_KEY_ALIAS = "navo"
$env:NAVO_KEY_PASSWORD = "your_key_password"

# Linux/macOS
export NAVO_KEYSTORE_PATH="/path/to/navo-release.keystore"
export NAVO_KEYSTORE_PASSWORD="your_keystore_password"
export NAVO_KEY_ALIAS="navo"
export NAVO_KEY_PASSWORD="your_key_password"
```

---

## Building the App

### Quick Build Commands

```bash
# Debug APK (for testing)
npm run cap:build:debug

# Release APK (signed, for distribution)
npm run cap:build:release

# Android App Bundle (for Play Store)
npm run cap:build:aab
```

### Manual Build Steps

#### 1. Debug APK

```bash
# Step 1: Build Next.js app
npm run build

# Step 2: Sync with Capacitor
npx cap sync

# Step 3: Build debug APK
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

#### 2. Release APK (Unsigned)

```bash
npm run build
npx cap sync
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

#### 3. Release APK (Signed)

**First, create a keystore (one-time setup):**

```bash
cd android/app

# Create keystore
keytool -genkey -v \
  -keystore navo-release.keystore \
  -alias navo \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password
# - Key password
# - Your name, organization, location
```

**Build signed release:**

```bash
# Method 1: Using environment variables
export NAVO_KEYSTORE_PATH="android/app/navo-release.keystore"
export NAVO_KEYSTORE_PASSWORD="your_password"
export NAVO_KEY_ALIAS="navo"
export NAVO_KEY_PASSWORD="your_key_password"

npm run cap:build:release

# Method 2: Manual signing (if not using env vars)
cd android
./gradlew assembleRelease

# Then sign manually:
jarsigner -verbose \
  -sigalg SHA256withRSA \
  -digestalg SHA-256 \
  -keystore app/navo-release.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  navo

# Verify signing:
jarsigner -verify app/build/outputs/apk/release/app-release-unsigned.apk
```

#### 4. Android App Bundle (AAB) for Play Store

```bash
# Build AAB (includes both 32-bit and 64-bit native libraries)
npm run build
npx cap sync
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Build Output Locations

```
android/app/build/outputs/
├── apk/
│   ├── debug/
│   │   └── app-debug.apk              # Debug build
│   └── release/
│       ├── app-release-unsigned.apk   # Unsigned release
│       └── app-release.apk            # Signed release (if configured)
└── bundle/
    └── release/
        └── app-release.aab            # Play Store bundle
```

---

## Testing

### Testing Methods

#### 1. Android Emulator

```bash
# Open Android Studio → Device Manager
# Create a virtual device (Pixel 4, API 30+)
# Run: ./gradlew installDebug
```

#### 2. Physical Device

```bash
# Enable USB debugging on your Android device
# Connect via USB
# Verify connection:
adb devices

# Install debug APK:
adb install android/app/build/outputs/apk/debug/app-debug.apk

# View logs:
adb logcat | grep Navo
```

#### 3. Android Studio

1. Open Android Studio: `npx cap open android`
2. Click "Run" (▶) button
3. Select device (emulator or connected phone)

### What to Test

1. **App Launch**
   - Splash screen displays correctly
   - App loads without white screen
   - Content loads from remote URL

2. **Navigation**
   - Back button works
   - No navigation issues
   - Smooth scrolling

3. **Offline Behavior**
   - Turn off WiFi/mobile data
   - App should show offline page or cached content
   - Turn on network - app should recover

4. **Supabase Auth**
   - Login works
   - Tokens not cached improperly
   - Logout works

5. **Performance**
   - App loads quickly on low-end device
   - No excessive memory usage
   - Smooth animations

---

## Troubleshooting

### Common Issues and Solutions

#### 1. White Screen on Launch

**Symptom:** App shows blank white screen instead of content.

**Causes & Solutions:**

- **Invalid URL in capacitor.config.ts**
  ```typescript
  // WRONG
  url: 'http://localhost:3000'
  
  // CORRECT
  url: 'https://your-app.vercel.app'
  ```

- **CORS Issues**
  Ensure your deployed site allows requests from `capacitor://localhost`:
  ```javascript
  // next.config.js
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  }
  ```

- **Cleartext Traffic Blocked**
  Check if URL uses HTTPS:
  ```xml
  <!-- AndroidManifest.xml -->
  android:usesCleartextTraffic="false"
  ```

**Debug Steps:**
```bash
# View WebView console logs in Android Studio
# 1. Open Android Studio
# 2. View → Tool Windows → Logcat
# 3. Filter by "Navo" or "Capacitor"

# Or use ADB
adb logcat | grep -i "console\|chromium\|capacitor"
```

#### 2. Network Errors / Mixed Content

**Symptom:** "Mixed Content" errors or resources not loading.

**Solution:**
```typescript
// capacitor.config.ts
server: {
  url: 'https://your-site.com',  // Must be HTTPS
  cleartext: false,               // Disable HTTP
}
```

If you MUST use HTTP for development:
```xml
<!-- AndroidManifest.xml -->
android:usesCleartextTraffic="true"
android:networkSecurityConfig="@xml/network_security_config"
```

#### 3. App Not Updating After Deploy

**Symptom:** App shows old version of website.

**Solutions:**

1. **Clear WebView cache:**
   ```bash
   adb shell pm clear com.navo.lite
   ```

2. **Add cache-busting headers to your web server**

3. **Use unique URL with version:**
   ```typescript
   url: `https://your-app.vercel.app?v=${Date.now()}`
   ```

#### 4. Gradle Sync Failed

**Symptom:** Android Studio shows "Gradle sync failed".

**Solutions:**

```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew build

# Or in Android Studio:
# Build → Clean Project
# Build → Rebuild Project
# File → Sync Project with Gradle Files
```

**If Java version mismatch:**
```bash
# Check Java version
java -version  # Should be 17

# In Android Studio:
# File → Project Structure → SDK Location → Gradle Settings
# Set Gradle JDK to 17
```

#### 5. Icons Not Showing

**Symptom:** App shows default Android icon.

**Solution:**
```bash
# Regenerate icons
node scripts/setup-android-resources.js

# Sync again
npx cap sync
```

Verify files exist:
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png
├── mipmap-hdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
└── mipmap-xxxhdpi/ic_launcher.png
```

#### 6. Supabase Auth Not Working

**Symptom:** Login fails or tokens not persisting.

**Solutions:**

1. **Check Network-Only caching for auth:**
   ```javascript
   // next.config.js (PWA config)
   {
     urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
     handler: "NetworkOnly",
   }
   ```

2. **Use Capacitor's native HTTP:**
   ```bash
   npm install @capacitor-community/http
   ```

3. **Verify deep linking configuration** for OAuth callbacks.

#### 7. APK Too Large

**Symptom:** APK file is larger than expected.

**Solutions:**

1. **Enable ProGuard (already enabled):**
   ```gradle
   minifyEnabled true
   shrinkResources true
   ```

2. **Build AAB instead of APK:**
   ```bash
   ./gradlew bundleRelease
   ```

3. **Use App Bundle for Play Store** (smaller download size).

#### 8. Back Button Not Working

**Symptom:** Hardware back button closes app instead of navigating back.

**Solution:**
```typescript
// capacitor.config.ts
android: {
  captureInput: true,  // Capture back button
}
```

```javascript
// In your web app, handle back button:
document.addEventListener('backbutton', (e) => {
  e.preventDefault();
  // Navigate back in your app
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Exit app
    App.exitApp();
  }
});
```

---

## Play Store Deployment

### 1. Prepare for Release

**Requirements:**
- Signed AAB file
- Privacy policy URL
- App screenshots (phone + tablet)
- Feature graphic (1024x500)
- App icon (512x512)

### 2. Create Google Play Developer Account

1. Go to https://play.google.com/console
2. Pay $25 one-time fee
3. Complete account setup

### 3. Create App Listing

1. Click "Create app"
2. Fill in app details:
   - App name: "Navo Lite"
   - Default language: English
   - App or game: App
   - Free or paid: Free

### 4. Upload AAB

1. Go to "Production" → "Create new release"
2. Upload your `app-release.aab`
3. Add release notes
4. Review and roll out

### 5. Content Rating

1. Go to "Content rating"
2. Fill out the questionnaire
3. Get rating (likely "Everyone" for an education app)

### 6. Store Listing

Upload:
- App icon (512x512 PNG)
- Feature graphic (1024x500)
- Phone screenshots (minimum 2)
- Tablet screenshots (optional)
- Short description (80 chars)
- Full description (4000 chars)

---

## Performance Optimization Tips

### 1. Lazy Loading
Ensure your Next.js app uses:
```javascript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false,
});
```

### 2. Image Optimization
```javascript
// Use Next.js Image component with priority
<Image 
  src="/logo.png" 
  width={200} 
  height={50} 
  priority 
  alt="Logo"
/>
```

### 3. Service Worker Strategy
Your PWA should use:
- `NetworkFirst` for API calls
- `CacheFirst` for static assets
- Short cache durations for dynamic content

### 4. Reduce APK Size
- Build AAB instead of universal APK
- Enable ProGuard (already done)
- Use vector icons instead of PNGs where possible

---

## Useful Commands Reference

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build Next.js for production

# Capacitor
npx cap sync             # Sync web code to native project
npx cap open android     # Open Android Studio
npx cap run android      # Run on connected device/emulator
npx cap copy             # Copy web assets (faster than sync)

# Android Builds
cd android
./gradlew assembleDebug       # Debug APK
./gradlew assembleRelease     # Release APK (unsigned)
./gradlew bundleRelease       # AAB for Play Store
./gradlew clean               # Clean build files

# ADB Commands
adb devices              # List connected devices
adb install app.apk      # Install APK
adb uninstall com.navo.lite  # Uninstall app
adb logcat               # View device logs
adb shell pm clear com.navo.lite  # Clear app data

# Keystore
keytool -genkey          # Create new keystore
keytool -list            # List keystore contents
jarsigner -verify        # Verify APK signing
```

---

## Additional Resources

- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Developer:** https://developer.android.com/
- **Play Console Help:** https://support.google.com/googleplay/android-developer

---

## Support

For issues specific to:
- **Next.js PWA:** Check `PWA_SETUP.md`
- **Capacitor Integration:** Check this guide
- **Supabase Integration:** Check Supabase documentation
