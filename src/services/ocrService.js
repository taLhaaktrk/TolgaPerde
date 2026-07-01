// expo-file-system v19'da API yenilendi; eski readAsStringAsync arayüzü /legacy altına taşındı.
import * as FileSystem from 'expo-file-system/legacy';
import {
  GOOGLE_VISION_API_KEY,
  VISION_ENDPOINT,
  isVisionConfigured,
} from '../config/visionConfig';

// El yazısı için DOCUMENT_TEXT_DETECTION, basılı metin + el yazısı karması olsa bile
// daha iyi sonuç verir. Türkçe karakterler için languageHints: ['tr'].
async function callVision(base64Image) {
  if (!isVisionConfigured()) {
    throw new Error('Vision API anahtarı tanımlı değil — visionConfig.js dosyasına ekle.');
  }

  const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['tr'] },
      },
    ],
  };

  const res = await fetch(VISION_ENDPOINT(GOOGLE_VISION_API_KEY), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Vision HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function titleCaseTr(s) {
  return s
    .toLocaleLowerCase('tr')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toLocaleUpperCase('tr') + w.slice(1))
    .join(' ');
}

// Heuristik: defterin tepesindeki "Mustafa Bakar" gibi 1-4 kelimelik harf satırını ismi say.
const NAME_LINE_RE = /^[A-Za-zÇĞİÖŞÜçğıöşü.\-']+(\s+[A-Za-zÇĞİÖŞÜçğıöşü.\-']+){0,3}$/;

export function guessPersonName(fullText) {
  if (!fullText) return '';
  const lines = fullText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.length < 4 || line.length > 40) continue;
    if (!NAME_LINE_RE.test(line)) continue;
    return titleCaseTr(line);
  }
  // Fallback: ilk dolu satırı 40 karakterle keserek dön.
  return lines[0] ? titleCaseTr(lines[0]).slice(0, 40) : '';
}

export async function detectHandwriting(imageUri) {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const raw = await callVision(base64);
  const annotation = raw?.responses?.[0]?.fullTextAnnotation;
  const fullText = annotation?.text ?? '';
  return {
    fullText,
    guessedName: guessPersonName(fullText),
    raw,
  };
}
