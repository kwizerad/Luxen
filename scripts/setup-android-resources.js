#!/usr/bin/env node

/**
 * Setup script for Android resources
 * Generates app icons and splash screen from SVG sources
 * 
 * Requirements: ImageMagick must be installed
 * Install: 
 *   - Windows: choco install imagemagick
 *   - macOS: brew install imagemagick  
 *   - Linux: sudo apt install imagemagick
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');

console.log('🚀 Navo Lite Android Resource Setup\n');

// Verify Android resources directory exists
if (!fs.existsSync(androidResDir)) {
  console.error('❌ Android resources directory not found.');
  console.error('   Please run "npx cap add android" first.');
  process.exit(1);
}

// Check if ImageMagick is available
console.log('🔍 Checking for ImageMagick...');
try {
  execSync('magick -version', { stdio: 'ignore' });
  console.log('✅ ImageMagick found\n');
} catch (error) {
  console.error('❌ ImageMagick not found.\n');
  console.error('Please install ImageMagick:');
  console.error('  Windows: choco install imagemagick');
  console.error('  macOS:   brew install imagemagick');
  console.error('  Linux:   sudo apt install imagemagick');
  process.exit(1);
}

// Create necessary directories
console.log('📁 Creating directories...');
const dirs = [
  'drawable',
  'drawable-land', 
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

dirs.forEach(dir => {
  const dirPath = path.join(androidResDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  Created: res/${dir}`);
  }
});
console.log('');

// Generate launcher icons
console.log('🎨 Generating launcher icons...');
const iconSizes = [
  { size: 48, density: 'mdpi' },
  { size: 72, density: 'hdpi' },
  { size: 96, density: 'xhdpi' },
  { size: 144, density: 'xxhdpi' },
  { size: 192, density: 'xxxhdpi' }
];

const iconSvg = path.join(publicIconsDir, 'icon.svg');
if (!fs.existsSync(iconSvg)) {
  console.error(`❌ Source icon not found: ${iconSvg}`);
  process.exit(1);
}

iconSizes.forEach(({ size, density }) => {
  const outputPath = path.join(androidResDir, `mipmap-${density}`, 'ic_launcher.png');
  try {
    execSync(`magick "${iconSvg}" -resize ${size}x${size} -background none "${outputPath}"`, { stdio: 'ignore' });
    console.log(`  ✓ ${size}x${size} (${density})`);
  } catch (error) {
    console.error(`  ✗ Failed to generate ${density} icon`);
  }
});

// Generate round icons (same sizes)
console.log('\n🎨 Generating round icons...');
iconSizes.forEach(({ size, density }) => {
  const outputPath = path.join(androidResDir, `mipmap-${density}`, 'ic_launcher_round.png');
  try {
    execSync(`magick "${iconSvg}" -resize ${size}x${size} -background '#3b82f6' "${outputPath}"`, { stdio: 'ignore' });
    console.log(`  ✓ ${size}x${size} round (${density})`);
  } catch (error) {
    console.error(`  ✗ Failed to generate ${density} round icon`);
  }
});

// Generate splash screen
console.log('\n🖼️  Generating splash screen...');
const splashIcon = path.join(publicIconsDir, 'icon-512x512.svg');
if (fs.existsSync(splashIcon)) {
  const splashPath = path.join(androidResDir, 'drawable', 'splash.png');
  const splashLandPath = path.join(androidResDir, 'drawable-land', 'splash.png');
  
  try {
    // Portrait splash
    execSync(
      `magick "${splashIcon}" -resize 2000x2000 -background '#3b82f6' -gravity center -extent 2732x2732 "${splashPath}"`,
      { stdio: 'ignore' }
    );
    console.log('  ✓ Portrait splash (2732x2732)');
    
    // Landscape splash (copy for now, can customize later)
    fs.copyFileSync(splashPath, splashLandPath);
    console.log('  ✓ Landscape splash (2732x2732)');
  } catch (error) {
    console.error('  ✗ Failed to generate splash screen');
  }
} else {
  console.log('  ⚠️  Skipped: icon-512x512.svg not found');
}

// Create colors.xml
console.log('\n📝 Creating colors.xml...');
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#3b82f6</color>
    <color name="colorPrimaryDark">#1d4ed8</color>
    <color name="colorAccent">#60a5fa</color>
    <color name="ic_launcher_background">#3b82f6</color>
</resources>`;

const valuesDir = path.join(androidResDir, 'values');
if (!fs.existsSync(valuesDir)) {
  fs.mkdirSync(valuesDir, { recursive: true });
}
fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml);
console.log('  ✓ colors.xml');

console.log('\n✅ Android resources setup complete!');
console.log('\nNext steps:');
console.log('  1. Open Android Studio: npx cap open android');
console.log('  2. Build debug APK: cd android && ./gradlew assembleDebug');
console.log('  3. Or run: npm run cap:build:debug');
