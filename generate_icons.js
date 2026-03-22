/**
 * Icon generator for Joy's Kitchen PWA
 * Run once:  node generate_icons.js
 * Requires:  npm install sharp
 *
 * Place your source image (at least 512×512) at ./public/NOODLES_images.jpg
 * Icons are written to ./public/icons/
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "public", "NOODLES_images.jpg");
const OUT = path.join(__dirname, "public", "icons");
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  for (const size of SIZES) {
    const dest = path.join(OUT, `icon-${size}.png`);
    await sharp(SRC)
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(dest);
    console.log(`✅  ${dest}`);
  }
  console.log("\n🎉  All icons generated! Copy them into public/icons/");
})();
