export const API_URL_PROD = "http://localhost:3000/api";
export const API_URL_DEV = "http://10.0.2.2:3000/api";

// Single source of truth for the backend URL. Set EXPO_PUBLIC_API_URL in
// .env.local (e.g. http://<your-lan-ip>:3000/api for Expo Go on a phone).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? API_URL_DEV;

// style
// ("#fff2de");
// ("#d96f3275");
// ("#C75D2C");
// ("#c75d2c4d");
// ("#c75d2c79");
// ("#F8B259");
// ("#2cc76d");
// ("#c7362c");
// ("#e9b190");
