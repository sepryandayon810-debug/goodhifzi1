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
database.enablePersistence({synchronizeTabs: true})
  .then(() => {
    console.log('✅ Offline persistence enabled');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Browser tidak support offline persistence');
    }
  });

console.log('✅ Firebase initialized');
