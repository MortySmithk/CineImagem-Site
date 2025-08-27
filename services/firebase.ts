import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBN-T5hNy74LYhVl1N4mThfvjaR4khb--U",
  authDomain: "cineveoimagem.firebaseapp.com",
  projectId: "cineveoimagem",
  storageBucket: "cineveoimagem.appspot.com",
  messagingSenderId: "681903001946",
  appId: "1:681903001946:web:6294e710bfd13482a0e363"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const handleLogin = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        // Login bem-sucedido
        console.log(result.user);
      })
      .catch((error) => {
        // Lidar com erros
        console.error(error);
      });
};

export const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // Logout bem-sucedido
        console.log("Usuário deslogado");
      })
      .catch((error) => {
        // Lidar com erros
        console.error(error);
      });
};