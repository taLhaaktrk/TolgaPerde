// Web/Electron'a özel global CSS — sadece web bundle'ında import edilir.
// Native (iOS/Android) tarafta bu dosyanın .web.js olmayan boş kardeşi yüklenir.

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.setAttribute('data-tolgaperde-global', 'true');
  style.textContent = `
    /* Tarayıcı default odak halkası — input'larda mavi kalın çerçeve çirkin */
    *:focus { outline: none !important; }

    /* Tarayıcı seçim rengi — bordo + beyaz */
    ::selection {
      background-color: rgba(195, 49, 65, 0.55);
      color: #FFFFFF;
    }

    /* SCROLLBAR — ince, koyu, bordo hover.
       WebKit (Electron / Chrome) için */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(15, 27, 48, 0.4);
      border-radius: 8px;
    }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg,
        rgba(195, 49, 65, 0.5) 0%,
        rgba(123, 24, 32, 0.7) 100%);
      border-radius: 8px;
      border: 2px solid rgba(15, 27, 48, 0.4);
      transition: background 200ms;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg,
        rgba(201, 169, 97, 0.8) 0%,
        rgba(195, 49, 65, 0.9) 100%);
    }
    ::-webkit-scrollbar-thumb:active {
      background: rgba(201, 169, 97, 0.95);
    }
    ::-webkit-scrollbar-corner {
      background: transparent;
    }

    /* Firefox için (Electron Chromium kullanır ama yine de) */
    * {
      scrollbar-width: thin;
      scrollbar-color: rgba(195, 49, 65, 0.6) rgba(15, 27, 48, 0.3);
    }

    /* Tüm body — system font fallback temiz olsun */
    body {
      margin: 0;
      background: #0A1628;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Number input spinner ok'larını kaldır (TextInput'larımız için temiz görünüm) */
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

export default null;
