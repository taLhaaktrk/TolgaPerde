module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin DAİMA listenin SON elemanı olmalı.
    // Reanimated 4 bu plugin üzerinden worklet'leri derler.
    plugins: ['react-native-worklets/plugin'],
  };
};
