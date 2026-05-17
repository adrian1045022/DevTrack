import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Usamos las variables del .env.local para que sea seguro
const firebaseConfig = {
  apiKey: "AIzaSyAl1m03jqvKWdb8dy2zM94fJDqLfoMChaE",
  authDomain: "devtrack-2e12d.firebaseapp.com",
  projectId: "devtrack-2e12d",
  storageBucket: "devtrack-2e12d.firebasestorage.app",
  messagingSenderId: "1053453947456",
  appId: "1:1053453947456:web:1b441aa5e4092d14bf85a5"
};

// Esta línea es MAGIA: Si la app ya está encendida, la usa; si no, la crea.
// Así evitas el error de "Firebase App already exists"
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Exportamos "auth" para que el Login y el Dashboard puedan usarlo
export const auth = getAuth(app);