# Android Resources for Navo Lite

This folder contains source files for Android app resources.

## Icon Generation

To generate proper Android icons from the SVG source:

### Option 1: Using Android Studio
1. Right-click on `res` folder → New → Image Asset
2. Select "Launcher Icons (Adaptive and Legacy)"
3. Choose your source SVG: `../public/icons/icon.svg`
4. Configure:
   - Name: `ic_launcher`
   - Background layer color: `#3b82f6`
   - Foreground layer: your SVG
5. Click Next → Finish

### Option 2: Using Online Tools
1. Go to https://romannurik.github.io/AndroidAssetStudio/
2. Select "Launcher icon generator"
3. Upload your SVG
4. Download the generated ZIP
5. Extract to `android/app/src/main/res/`

### Option 3: Manual Conversion
Use ImageMagick to generate all sizes:

```bash
# Create a script to generate icons
mkdir -p drawable-xxxhdpi drawable-xxhdpi drawable-xhdpi drawable-hdpi drawable-mdpi

for size in 48 72 96 144 192; do
  density=""
  case $size in
    48) density="mdpi" ;;
    72) density="hdpi" ;;
    96) density="xhdpi" ;;
    144) density="xxhdpi" ;;
    192) density="xxxhdpi" ;;
  esac
  magick ../public/icons/icon.svg -resize ${size}x${size} drawable-${density}/ic_launcher.png
done
```

## Splash Screen

Capacitor uses the splash screen plugin. The splash screen image should be:
- Format: PNG
- Size: 2732×2732 pixels (for all densities)
- Location: `android/app/src/main/res/drawable/splash.png`

To generate:
```bash
magick ../public/icons/icon-512x512.svg -resize 2732x2732 -background '#3b82f6' -gravity center -extent 2732x2732 splash.png
```

Then copy to:
- `android/app/src/main/res/drawable/splash.png`

## Required Resources

The app needs these resources in `android/app/src/main/res/`:

```
res/
├── drawable/
│   └── splash.png (2732x2732)
├── drawable-land/
│   └── splash.png (2732x2732, landscape version)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_foreground.png (162x162 for adaptive icons)
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_foreground.png (108x108)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_foreground.png (216x216)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_foreground.png (324x324)
├── mipmap-xxxhdpi/
│   ├── ic_launcher.png (192x192)
│   └── ic_launcher_foreground.png (432x432)
└── values/
    ├── colors.xml (app colors)
    └── styles.xml (app themes)
```

## Quick Setup Script

Save this as `scripts/setup-android-resources.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidResDir = path.join(__dirname, '../android/app/src/main/res');
const publicIconsDir = path.join(__dirname, '../public/icons');

// Create directories
const dirs = [
  'drawable', 'drawable-land',
  'mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'
];

dirs.forEach(dir => {
  const dirPath = path.join(androidResDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Check if ImageMagick is available
try {
  execSync('magick -version', { stdio: 'ignore' });
  console.log('ImageMagick found, generating resources...');
  
  // Generate icons
  const iconSizes = [
    { size: 48, density: 'mdpi' },
    { size: 72, density: 'hdpi' },
    { size: 96, density: 'xhdpi' },
    { size: 144, density: 'xxhdpi' },
    { size: 192, density: 'xxxhdpi' }
  ];
  
  iconSizes.forEach(({ size, density }) => {
    const outputPath = path.join(androidResDir, `mipmap-${density}`, 'ic_launcher.png');
    execSync(`magick "${path.join(publicIconsDir, 'icon.svg')}" -resize ${size}x${size} "${outputPath}"`);
    console.log(`Generated ${size}x${size} icon for ${density}`);
  });
  
  // Generate splash screen
  const splashPath = path.join(androidResDir, 'drawable', 'splash.png');
  execSync(`magick "${path.join(publicIconsDir, 'icon-512x512.svg')}" -resize 2732x2732 -background '#3b82f6' -gravity center -extent 2732x2732 "${splashPath}"`);
  console.log('Generated splash screen');
  
} catch (error) {
  console.error('ImageMagick not found. Please install it first:');
  console.error('Windows: choco install imagemagick');
  console.error('macOS: brew install imagemagick');
  console.error('Linux: sudo apt install imagemagick');
  process.exit(1);
}
```

Run it:
```bash
node scripts/setup-android-resources.js
```
