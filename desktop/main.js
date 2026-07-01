const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');
const express = require('express');

// Üstteki File / Edit / View / Window / Help menü çubuğunu tamamen kaldır.
// Production app için profesyonel görünüm.
Menu.setApplicationMenu(null);

// localStorage / cookie / cache / IndexedDB için sabit isim — her açılışta
// aynı user data partition'ı garanti eder. setName + setPath İKİSİ DE app.whenReady
// öncesi olmalı, yoksa Electron varsayılan path'i (Electron) kullanır ve localStorage kayıp olur.
app.setName('TolgaPerde');
// userData yolunu sabitle — kurulum yenilense bile aynı klasör.
const userDataPath = path.join(app.getPath('appData'), 'TolgaPerde');
app.setPath('userData', userDataPath);

// Tek instance kilidi — aynı anda 2 pencere açılıp partition kilitlenmesin.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Expo web export'u (dist/) küçük bir yerel sunucudan servis ediyoruz.
// file:// ile yüklemek Expo'nun mutlak asset yollarını (/_expo/...) kırar;
// http://127.0.0.1 üzerinden servis bu sorunu tamamen çözer.
function getWebDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'dist') // electron-builder extraResources ile kopyalanır
    : path.join(__dirname, '..', 'dist');      // geliştirmede proje kökündeki dist
}

let server;
let win;

function createWindow() {
  const webDir = getWebDir();
  const srv = express();
  srv.use(express.static(webDir));
  // SPA fallback — her route index.html'e düşsün
  srv.get('*', (req, res) => res.sendFile(path.join(webDir, 'index.html')));

  // SABİT port — rastgele port verirsek localStorage origin (host:port) değişir
  // ve her açılışta Chromium farklı site sanır, kayıt kaybolur.
  const FIXED_PORT = 47821;
  server = srv.listen(FIXED_PORT, '127.0.0.1', () => {
    const port = FIXED_PORT;
    // Pencere ikonu — dev'de proje kökündeki PNG, packaged'da extraResources içinden
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'dist', 'logo.png') // packaged içine kopyalanmış olabilir
      : path.join(__dirname, '..', 'assets', 'logo.png');

    win = new BrowserWindow({
      width: 1280,
      height: 820,
      icon: iconPath,
      minWidth: 900,
      minHeight: 600,
      backgroundColor: '#0A1628',
      title: 'Tolga Perde',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        // Kalıcı partition — localStorage / IndexedDB bu isimde diske yazılır.
        partition: 'persist:tolgaperde',
      },
    });

    // Dış linkleri varsayılan tarayıcıda aç (Firebase/Storage indirme vb.)
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    win.loadURL(`http://127.0.0.1:${port}`);
    win.on('closed', () => { win = null; });
  });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
