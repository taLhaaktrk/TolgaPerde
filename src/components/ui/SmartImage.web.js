import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

// Web'de RN'in <Image> bileşeni resmi <div background-image> olarak render eder
// ve bazı Firebase Storage URL'lerinde boş kalıyor. Bunun yerine düz <img>
// HTML tag'i kullanıyoruz — preload native, hızlı ve güvenilir.
//
// Aynı API: source={{uri}}, style, resizeMode, onLoadStart, onLoad, onError
export default function SmartImage({
  source,
  style,
  resizeMode = 'contain',
  onLoadStart,
  onLoad,
  onError,
}) {
  const uri = source?.uri || '';

  useEffect(() => {
    onLoadStart?.();
  }, [uri]);

  if (!uri) return <View style={style} />;

  const fit =
    resizeMode === 'cover' ? 'cover'
    : resizeMode === 'stretch' ? 'fill'
    : resizeMode === 'center' ? 'none'
    : 'contain';

  // wrap: parent boyutunu doldurur ve kesinlikle taşmayı keser.
  // img: absolute + 100%/100% — parent'ın dışına çıkamaz.
  return (
    <View style={[styles.wrap, style]}>
      <img
        src={uri}
        alt=""
        onLoad={(e) => onLoad?.(e)}
        onError={(e) => onError?.(e)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: fit,
          display: 'block',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
  },
});
