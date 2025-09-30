import "./global.css"

/* @refresh reload */
import { render } from 'solid-js/web';
import 'solid-devtools';

import App from './App';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

// render(() => <App />, root!);

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmhyS8vRGw35zxDZOaHkjENFODLi_dhy8",
  authDomain: "missile-command-8a4e7.firebaseapp.com",
  databaseURL: "https://missile-command-8a4e7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "missile-command-8a4e7",
  storageBucket: "missile-command-8a4e7.firebasestorage.app",
  messagingSenderId: "660239741911",
  appId: "1:660239741911:web:8cd8e7670aa1d649905192",
  measurementId: "G-35X7F01Z30"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);