/**
 * Genera íconos PNG para el PWA manifest.
 * Usa sharp (SVG → PNG). Correr con: node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';

// Paleta de la app (css/app.css): fondo gris oscuro y el acento de los botones
const ACENTO = '#5d68e0';
const FONDO = '#111214';

// Un "$" blanco, grueso, centrado en un cuadrado redondeado
function signo(size, cx, cy, fontSize) {
  return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="700" font-family="DejaVu Sans,Arial,Helvetica,sans-serif" fill="#ffffff">$</text>`;
}

// Estándar: el cuadrado ocupa el 76% (zona segura) sobre el fondo oscuro
function iconSVG(size, padding = 0.12) {
  const pad = Math.round(size * padding);
  const inner = size - pad * 2;
  const rx = Math.round(inner * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${FONDO}"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${rx}" fill="${ACENTO}"/>
  ${signo(size, size / 2, size / 2 + inner * 0.03, Math.round(inner * 0.62))}
</svg>`;
}

// Maskable / iOS: el color llena todo el cuadrado (el sistema recorta las esquinas)
function maskableSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ACENTO}"/>
  ${signo(size, size / 2, size / 2 + size * 0.02, Math.round(size * 0.5))}
</svg>`;
}

async function gen(svgStr, outPath) {
  await sharp(Buffer.from(svgStr))
    .png()
    .toFile(outPath);
  console.log('listo', outPath);
}

await gen(iconSVG(192),        'public/icons/icon-192.png');
await gen(iconSVG(512),        'public/icons/icon-512.png');
await gen(maskableSVG(192),    'public/icons/icon-maskable-192.png');
await gen(maskableSVG(512),    'public/icons/icon-maskable-512.png');
// Apple touch icon (180x180, PNG requerido por iOS)
await gen(maskableSVG(180),    'public/icons/apple-touch-icon.png');

console.log('Íconos generados en public/icons/');
