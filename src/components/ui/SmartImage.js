import React from 'react';
import { Image } from 'react-native';

// Native (iOS/Android): standart RN Image bileşenini aynen kullan.
// Web tarafı için ayrı dosya var: SmartImage.web.js (HTML <img>)
export default function SmartImage(props) {
  return <Image {...props} />;
}
