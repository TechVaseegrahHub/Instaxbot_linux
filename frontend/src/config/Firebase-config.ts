// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQGCOlsJZSd6BjoiArDWWofQ_RsaeZJbU",
  authDomain: "instax-7b862.firebaseapp.com",
  databaseURL: "https://instax-7b862-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "instax-7b862",
  storageBucket: "instax-7b862.firebasestorage.app",
  messagingSenderId: "94854090374",
  appId: "1:94854090374:web:b75e5ce64dadcff55dcb07",
  measurementId: "G-PG5H807T7Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const realtimeDb = getDatabase(app);