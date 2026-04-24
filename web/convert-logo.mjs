import sharp from "sharp";
import { readFileSync } from "fs";

const pufferSvg = readFileSync("public/logo.svg", "utf8");

// Wrap the pufferfish in a dark rounded background
function withBackground(size) {
  const scale = size / 520; // original viewBox is 680x520, fish centered around 340,278
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#080d22"/>
      <stop offset="100%" stop-color="#060818"/>
    </radialGradient>
  </defs>
  <!-- Dark background -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <!-- Blue top accent line -->
  <rect width="${size}" height="${size * 0.012}" rx="${size * 0.006}" fill="#2563eb" opacity="0.7"/>
  <!-- Pufferfish centered -->
  <g transform="translate(${size * 0.5 - 340 * scale}, ${size * 0.5 - 278 * scale}) scale(${scale})">
    ${pufferSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").replace(/<title>.*?<\/title>/s, "").replace(/<desc>.*?<\/desc>/s, "")}
  </g>
</svg>`;
}

await sharp(Buffer.from(withBackground(512))).png().toFile("public/logo-512.png");
await sharp(Buffer.from(withBackground(256))).png().toFile("public/logo-256.png");
await sharp(Buffer.from(withBackground(64))).png().toFile("public/favicon-64.png");

console.log("Done — logo-512.png, logo-256.png, favicon-64.png saved to web/public/");
