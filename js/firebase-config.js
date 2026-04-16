/**
 * WebPOS Firebase Configuration
 */

const firebaseConfig = {
  apiKey: "AIzaSyD9XyvgofyFyX5aUMARcA_GO-N2Tcw725Q",
  authDomain: "goodhifzicell.firebaseapp.com",
  databaseURL: "https://goodhifzicell-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "goodhifzicell",
  storageBucket: "goodhifzicell.firebasestorage.app",
  messagingSenderId: "306835710868",
  appId: "1:306835710868:web:817551e6c8c19c8eca6581"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export references
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

console.log('✅ Firebase RTDB initialized (offline ready)');
console.log('✅ Firebase initialized');
