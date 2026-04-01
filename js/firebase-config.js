
const firebaseConfig = {
  apiKey: "AIzaSyCfsIyB702Z9iV0BnN4L23j6P-nT_eCVr8",
  authDomain: "vidyachinthan-e-mag.firebaseapp.com",
  projectId: "vidyachinthan-e-mag",
  storageBucket: "vidyachinthan-e-mag.firebasestorage.app",
  messagingSenderId: "120244338162",
  appId: "1:120244338162:web:d3e589007bdfe7f288ff6b"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence().catch(err => console.log("Persistence error:", err));