# Navo Lite PWA Setup Guide

## Overview
This project has been configured as a Progressive Web App (PWA) called "Navo Lite" with the following features:

- **Offline support** with intelligent caching
- **Install prompt** for Android (Chrome) and iOS (Safari)
- **Optimized performance** with minimal bundle size
- **Supabase integration** with proper auth handling (no token caching)

## Files Created/Updated

### 1. `next.config.ts` (Updated)
```typescript
// PWA configuration with next-pwa
// - Runtime caching for static assets, images, and API calls
// - Excludes Supabase auth endpoints from caching
// - Fallback to /offline page when network unavailable
```

### 2. `public/manifest.json` (Created)
- App metadata (name: "Navo Lite", short_name: "Navo")
- Display mode: standalone
- Theme colors (blue: #3b82f6)
- Icons configuration (192x192, 512x512, and Apple touch icons)
- Shortcuts to Dashboard and Exams

### 3. `public/icons/` (Created)
- `icon.svg` - Source SVG icon
- `icon-192x192.svg` - Android home screen
- `icon-512x512.svg` - Splash screen
- `icon-180x180.svg` - iOS touch icon
- `icon-120x120.svg` - iOS smaller icon
- `icon-76x76.svg` - iPad icon
- `icon-96x96.svg` - Shortcuts icon

### 4. `app/offline/page.tsx` (Created)
- Offline fallback page shown when network is unavailable
- Retry button to reload the page
- Link to return home

### 5. `components/pwa-install-prompt.tsx` (Created)
- Detects Android (beforeinstallprompt) and iOS
- Shows install banner after 3-5 seconds delay
- Dismissible with 7-day reminder suppression
- iOS-specific instructions for "Add to Home Screen"

### 6. `app/layout.tsx` (Updated)
- Added manifest.json reference
- Added viewport configuration for mobile
- Added theme-color meta tags
- Added Apple web app meta tags
- Included PWAInstallPrompt component

## Caching Strategy

### Cached Assets (CacheFirst)
- JS, CSS, fonts: 30 days, 100 entries
- Images: 7 days, 200 entries

### API Caching (NetworkFirst)
- Supabase data: Network first, 1-day cache, 3s timeout
- General API: Stale-while-revalidate, 1-hour cache

### NOT Cached (NetworkOnly)
- Supabase auth endpoints (`/auth/v1/*`)
- User tokens and sensitive data

## Installation

### Install next-pwa dependency:
```bash
npm install next-pwa --save-dev --legacy-peer-deps
```

Or if you have peer dependency issues:
```bash
npm install next-pwa@5.6.0 --save-dev --legacy-peer-deps
```

## Icon Conversion (SVG to PNG)

While SVG icons work in modern browsers, for full compatibility you should convert them to PNG:

### Option 1: Online Tool
Use [SVG to PNG](https://svgtopng.com/) or similar tools to convert each SVG to the corresponding PNG size.

### Option 2: Command Line (requires ImageMagick)
```bash
# Install ImageMagick first (via choco, brew, or apt)
# Then run:
for size in 76 96 120 180 192 512; do
  magick public/icons/icon-${size}x${size}.svg public/icons/icon-${size}x${size}.png
done
```

### Option 3: Node.js Script
```javascript
// scripts/convert-icons.js
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [76, 96, 120, 180, 192, 512];

async function convertSVGtoPNG(svgPath, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Simple SVG to PNG conversion
  const img = await loadImage(svgPath);
  ctx.drawImage(img, 0, 0, size, size);
  
  const pngPath = svgPath.replace('.svg', '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  console.log(`Created ${pngPath}`);
}

async function main() {
  for (const size of sizes) {
    const svgPath = path.join(__dirname, '../public/icons', `icon-${size}x${size}.svg`);
    if (fs.existsSync(svgPath)) {
      await convertSVGtoPNG(svgPath, size);
    }
  }
}

main().catch(console.error);
```

After converting, update `manifest.json` and `layout.tsx` to use `.png` extensions instead of `.svg`.

## Testing the PWA

### 1. Build the application
```bash
npm run build
```

### 2. Start production server
```bash
npm start
```

### 3. Test with Lighthouse
- Open Chrome DevTools (F12)
- Go to Lighthouse tab
- Select "Progressive Web App" category
- Click "Analyze page load"
- Verify all checks pass

### 4. Test Install Prompt (Chrome/Android)
- Open DevTools
- Go to Application → Manifest
- Verify manifest is loaded correctly
- Click "Add to homescreen" to test

### 5. Test Offline Mode
- Open DevTools → Network tab
- Check "Offline" checkbox
- Refresh the page
- Verify offline page appears

### 6. Test on Real Devices
- **Android/Chrome**: Visit the site, look for "Add to Home screen" prompt
- **iOS/Safari**: Tap share button → "Add to Home Screen"

## Performance Considerations

1. **Bundle Size**: next-pwa adds ~50KB gzipped (workbox)
2. **Cache Size**: Configured with max entries to prevent storage quota issues
3. **Network Strategy**: Uses NetworkFirst for API calls to ensure fresh data
4. **Offline Page**: Lightweight fallback shown when network unavailable

## Security Notes

- Auth tokens are NEVER cached (NetworkOnly for `/auth/v1/*`)
- Service worker only registers in production
- HTTPS required for PWA features (service worker, push notifications)

## Troubleshooting

### "Add to Home Screen" not appearing
- Ensure site is served over HTTPS
- Check manifest.json is valid (DevTools → Application → Manifest)
- Verify service worker is registered (DevTools → Application → Service Workers)

### Icons not showing
- Check icon paths in manifest.json match actual file locations
- Ensure icon files are in `/public/icons/` directory
- Verify icon sizes match declared sizes in manifest

### Offline page not showing
- Check service worker is active
- Verify `fallbacks.document` is set to `/offline` in next.config.ts
- Ensure `/offline` page exists and is statically generated

### Supabase auth issues
- Ensure auth endpoints use `NetworkOnly` strategy
- Check no sensitive data is cached
- Verify `skipWaiting: true` in PWA config

## Next Steps

1. Replace placeholder SVG icons with your actual brand icons
2. Convert SVG icons to PNG for full compatibility
3. Add screenshots to manifest.json (place in `/public/screenshots/`)
4. Test on actual Android and iOS devices
5. Monitor performance in production
6. Consider adding push notifications (requires additional setup)
