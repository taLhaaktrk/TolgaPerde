// Expo web export sonrası dist/index.html'in <head>'ine PWA meta tagleri inject eder
// + dist/version.json üretir (auto-update kontrolü için).
// Vercel build adımında çalıştırılır.

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const HTML_PATH = path.join(DIST_DIR, 'index.html');
const VERSION_PATH = path.join(DIST_DIR, 'version.json');

// Build zamanı → benzersiz sürüm string'i (YYYYMMDD-HHMMSS)
function buildVersion() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    '-' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

const VERSION = buildVersion();

const PWA_TAGS = `
    <!-- PWA meta tagleri -->
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="theme-color" content="#5C0D14" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="TolgaPerde" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="application-name" content="TolgaPerde" />
    <meta name="format-detection" content="telephone=no" />
    <script>window.__APP_VERSION__ = ${JSON.stringify(VERSION)};</script>
`.trim();

function writeVersionJson() {
  const payload = {
    version: VERSION,
    buildTime: new Date().toISOString(),
  };
  fs.writeFileSync(VERSION_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[inject-pwa] ✓ version.json yazıldı → ${VERSION}`);
}

function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error('[inject-pwa] HATA: dist/index.html bulunamadı. Önce expo export çalıştır.');
    process.exit(1);
  }

  let html = fs.readFileSync(HTML_PATH, 'utf-8');

  // Zaten inject edilmiş mi kontrolü — duplicate eklemeyelim
  if (html.includes('apple-mobile-web-app-capable')) {
    console.log('[inject-pwa] PWA tagleri zaten mevcut, atlanıyor.');
  } else {
    if (!html.includes('</head>')) {
      console.error('[inject-pwa] HATA: <head> tag bulunamadı.');
      process.exit(1);
    }
    html = html.replace('</head>', `  ${PWA_TAGS}\n  </head>`);
    fs.writeFileSync(HTML_PATH, html, 'utf-8');
    console.log('[inject-pwa] ✓ PWA meta tagleri index.html\'e eklendi.');
  }

  writeVersionJson();
}

main();
