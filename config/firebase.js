import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCSgcQeQFuvSftwNiUbDYYoU9qIr-c7GBs",
  authDomain: "ecomercado-app-99021.firebaseapp.com",
  projectId: "ecomercado-app-99021",
  storageBucket: "ecomercado-app-99021.appspot.com",
  messagingSenderId: "701447751931",
  appId: "1:701447751931:web:1756c058f376035ba3c85e"
};

const app = initializeApp(firebaseConfig);

const authInstance = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const auth = authInstance;

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export const db = getFirestore(app);
export const usersCollection = collection(db, "users");
export const productsCollection = collection(db, "products");
export const donationCollection = collection(db, "donation");
export const messageCollection = collection(db, "messages");
export const feedbackCollection = collection(db, "feedback");
export const storage = getStorage(app);

const fetchProducts = async () => {
  let products = [];
  const snapshot = await getDocs(productsCollection);
  snapshot.forEach(doc => {
      products.push(doc.data());
  });
  return products;
};

const fetchDonations = async () => {
  let donations = [];
  const snapshot = await getDocs(donationCollection); 
  snapshot.forEach(doc => {
      donations.push(doc.data());
  });
  return donations;
};

