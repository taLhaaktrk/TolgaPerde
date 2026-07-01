// Expo web export sonrası dist/index.html'in <head>'ine PWA meta tagleri inject eder.
// Vercel build adımında çalıştırılır.

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'dist', 'index.html');

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
`.trim();

function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error('[inject-pwa] HATA: dist/index.html bulunamadı. Önce expo export çalıştır.');
    process.exit(1);
  }

  let html = fs.readFileSync(HTML_PATH, 'utf-8');

  // Zaten inject edilmiş mi kontrolü — duplicate eklemeyelim
  if (html.includes('apple-mobile-web-app-capable')) {
    console.log('[inject-pwa] PWA tagleri zaten mevcut, atlanıyor.');
    return;
  }

  // </head>'den hemen önce inject
  if (!html.includes('</head>')) {
    console.error('[inject-pwa] HATA: <head> tag bulunamadı.');
    process.exit(1);
  }

  html = html.replace('</head>', `  ${PWA_TAGS}\n  </head>`);
  fs.writeFileSync(HTML_PATH, html, 'utf-8');
  console.log('[inject-pwa] ✓ PWA meta tagleri index.html\'e eklendi.');
}

main();
