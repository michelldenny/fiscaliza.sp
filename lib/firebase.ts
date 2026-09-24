// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { firebaseConfig } from "./firebase-config";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase (com suporte a singleton/SSR/fast refresh)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export { firebaseConfig, app };
export default app;
