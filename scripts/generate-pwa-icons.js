const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "..", "public", "icons");

const sizes = [76, 96, 120, 180, 192, 512];

async function generatePNGs() {
  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    if (!fs.existsSync(svgPath)) {
      console.warn(`SVG not found: ${svgPath}, skipping`);
      continue;
    }

    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);

    console.log(`Generated ${pngPath}`);
  }

  // Also generate a favicon PNG
  const faviconSvg = path.join(iconsDir, "icon.svg");
  const faviconPng = path.join(iconsDir, "favicon.png");
  if (fs.existsSync(faviconSvg)) {
    await sharp(fs.readFileSync(faviconSvg))
      .resize(32, 32)
      .png()
      .toFile(faviconPng);
    console.log(`Generated ${faviconPng}`);
  }

  // Generate apple-touch-icon.png (180x180 is the recommended Apple touch icon size)
  const appleSvg = path.join(iconsDir, "icon-180x180.svg");
  const applePng = path.join(iconsDir, "apple-touch-icon.png");
  if (fs.existsSync(appleSvg)) {
    await sharp(fs.readFileSync(appleSvg))
      .resize(180, 180)
      .png()
      .toFile(applePng);
    console.log(`Generated ${applePng}`);
  }
}

generatePNGs().catch(console.error);
