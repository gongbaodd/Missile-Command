import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBmhyS8vRGw35zxDZOaHkjENFODLi_dhy8",
    authDomain: "missile-command-8a4e7.firebaseapp.com",
    databaseURL:
      "https://missile-command-8a4e7-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "missile-command-8a4e7",
    storageBucket: "missile-command-8a4e7.firebasestorage.app",
    messagingSenderId: "660239741911",
    appId: "1:660239741911:web:8cd8e7670aa1d649905192",
    measurementId: "G-35X7F01Z30",
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// const healthCheck = ref(db, "health_check");
const roomsRef = ref(db, "room")
