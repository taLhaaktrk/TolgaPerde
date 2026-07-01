const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK bazı submodüllerini .cjs olarak yayınlıyor; Metro bunu da çözebilsin.
config.resolver.sourceExts.push('cjs');

// Firebase v10 + iOS Expo Go (Hermes) uyumu için package exports'u kapatıyoruz.
// Aksi halde Firebase'in ESM versiyonundaki private class field'ları (`#x`)
// Hermes parser'ında "private properties are not supported" hatası verir.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
