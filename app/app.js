// // app.js
// import { initializeApp } from "firebase/app";
// import {
//     createUserWithEmailAndPassword,
//     getAuth,
//     signInWithEmailAndPassword,
// } from "firebase/auth";
// import { getDatabase } from "firebase/database";

// //config
// const firebaseConfig = {
//   apiKey: "AIzaSyCqkXSKzeeQ6LeQvanp3QGuflKK5Era-4s",
//   authDomain: "mindpath-3dcb9.firebaseapp.com",
//   projectId: "mindpath-3dcb9",
//   storageBucket: "mindpath-3dcb9.firebasestorage.app",
//   messagingSenderId: "187899674876",
//   appId: "1:187899674876:web:5e493df001d7d408905779",
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const database = getDatabase(app);

// // Caregiver logIn
// export default function CaregiverAuth() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [status, setStatus] = useState("");

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (user) console.log("User signed in:", user.email);
//       else console.log("User signed out");
//     });
//     return unsubscribe;
//   }, []);

//   export function signUp = () => {
//     createUserWithEmailAndPassword(auth, email, password)
//       .then((userCredential) => {
//         setStatus("Sign Up Successful!");
//         console.log("User:", userCredential.user);
//       })
//       .catch((error) => setStatus(error.message));
//   };

//   const logIn = () => {
//     signInWithEmailAndPassword(auth, email, password)
//       .then((userCredential) => {
//         setStatus("Login Successful!");
//         console.log("User:", userCredential.user);
//       })
//       .catch((error) => setStatus(error.message));
//   };
// }