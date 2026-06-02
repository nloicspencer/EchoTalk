import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDygrGd9IbrUGjIv621E0iSC1lDUyBO_Wc",
  authDomain: "echotalk-36db1.firebaseapp.com",
  projectId: "echotalk-36db1",
  storageBucket: "echotalk-36db1.firebasestorage.app",
  messagingSenderId: "856722110844",
  appId: "1:856722110844:web:ad0a1ac37d58e1571c8cf9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);