import sharp from "sharp";

// SVG logo — "B" mark in a rounded square, "Based ID" wordmark beside it
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" fill="#060818" rx="80"/>

  <!-- Blue square mark -->
  <rect x="96" y="96" width="320" height="320" fill="#2563eb" rx="40"/>

  <!-- "B" letterform cut out / overlaid in white -->
  <text
    x="256"
    y="340"
    font-family="Arial Black, sans-serif"
    font-size="240"
    font-weight="900"
    fill="white"
    text-anchor="middle"
    dominant-baseline="auto"
  >B</text>
</svg>`;

// Icon only — 512×512
await sharp(Buffer.from(svg))
  .png()
  .toFile("public/logo-512.png");

// Favicon size — 64×64
await sharp(Buffer.from(svg))
  .resize(64, 64)
  .png()
  .toFile("public/favicon-64.png");

// Wide version for social / OG use — 256×256
await sharp(Buffer.from(svg))
  .resize(256, 256)
  .png()
  .toFile("public/logo-256.png");

console.log("Done — logo-512.png, logo-256.png, favicon-64.png written to web/public/");
