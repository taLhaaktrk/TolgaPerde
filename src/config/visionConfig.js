// Google Cloud Vision REST API ayarları.
// Anahtarı GCP Console > APIs & Services > Credentials'tan alıp aşağıya yapıştır.
// Anahtar mutlaka "Cloud Vision API only" olacak şekilde restrict edilmeli.

export const GOOGLE_VISION_API_KEY = 'AIzaSyAovlJwHwy1LMcWUjad6OrOKvzQv2jfp3c';

export const VISION_ENDPOINT = (key = GOOGLE_VISION_API_KEY) =>
  `https://vision.googleapis.com/v1/images:annotate?key=${key}`;

export const isVisionConfigured = () =>
  !!GOOGLE_VISION_API_KEY && !GOOGLE_VISION_API_KEY.startsWith('PASTE_');
