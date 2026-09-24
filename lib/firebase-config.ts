export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCzQZNA1Bi_VASKk7nDjfbwtN4cRSG32XI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "fiscaliza-sp-24d1b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fiscaliza-sp-24d1b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "fiscaliza-sp-24d1b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "559767076244",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:559767076244:web:a0b557d661d50dbb5fe381",
} as const;

export const firebaseWebConfig = firebaseConfig;
