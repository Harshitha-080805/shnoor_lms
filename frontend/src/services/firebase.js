import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCUheXIHvu0eh7nhaDlMjsZ6TpgflupDLQ",
  authDomain: "shnoor-lms-auth.firebaseapp.com",
  projectId: "shnoor-lms-auth",
  storageBucket: "shnoor-lms-auth.firebasestorage.app",
  messagingSenderId: "1004023661410",
  appId: "1:1004023661410:web:e8d2f87fa73899c99a623b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
