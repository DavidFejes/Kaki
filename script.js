import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, signOut, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DEBUGGER INDUL: A DOM betöltődött. ---");
    
    // === Alap inicializálás ===
    const firebaseConfig = {
        apiKey: "AIzaSyDDHmub6fyzV7tEZ0lyYYVHEDYGnR4xiYI",
        authDomain: "kaki-b14a4.firebaseapp.com",
        projectId: "kaki-b14a4",
        storageBucket: "kaki-b14a4.appspot.com",
        messagingSenderId: "123120220357",
        appId: "1:123120220357:web:3386a6b8ded6c4ec3798ac"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    // === DOM Elemek ===
    const loader = document.getElementById('loader');
    const topBar = document.querySelector('.top-bar');
    const authBtn = document.getElementById('auth-btn');
    const mainContainer = document.querySelector('.container');
    const userDisplay = document.getElementById('user-display');

    // === HIBADETEKTÁLÁS ===

    console.log("--- Firebase inicializálva. Várakozás az azonosítási állapotra... ---");

    // 1. Megpróbáljuk elkapni a visszairányítás eredményét
    getRedirectResult(auth)
        .then((result) => {
            if (result) {
                console.log("%c>>> SIKER: A 'getRedirectResult' elkapta a felhasználót!", "color: lightgreen; font-weight: bold;");
                console.log("Felhasználó neve:", result.user.displayName);
                console.log("Felhasználó UID-je:", result.user.uid);
            } else {
                console.log("--- INFO: A 'getRedirectResult' nem talált eredményt. Ez normális, ha nem bejelentkezésből érkeztél. ---");
            }
        })
        .catch((error) => {
            console.error("%c>>> HIBA: A 'getRedirectResult' hibát dobott!", "color: red; font-weight: bold;");
            console.error("Hibakód:", error.code);
            console.error("Hibaüzenet:", error.message);
        });


    // 2. A legfontosabb figyelő, ami megmondja a végső állapotot
    onAuthStateChanged(auth, (user) => {
        console.log("--- 'onAuthStateChanged' ESEMÉNY ELSÜLT! ---");
        
        // Elrejtjük a töltőképernyőt, mert a Firebase végzett
        if (loader) loader.style.display = 'none';
        if (topBar) topBar.style.display = 'flex';

        if (user) {
            console.log("%c>>> ÁLLAPOT: BEJELENTKEZVE!", "background: green; color: white; font-size: 1.2em;");
            console.log("Bejelentkezett felhasználó:", user.displayName);

            // Mutatjuk a fő tartalmat
            if(userDisplay) userDisplay.textContent = `Üdv, ${user.displayName.split(' ')[0]}!`;
            if(authBtn) authBtn.textContent = "Kijelentkezés";
            if(mainContainer) mainContainer.style.display = 'block';

        } else {
            console.log("%c>>> ÁLLAPOT: KIJELENTKEZVE (user objektum null).", "background: #555; color: white;");
            
            // Mutatjuk a login felületet
            if(mainContainer) mainContainer.style.display = 'none';
            if(authBtn) authBtn.textContent = "Bejelentkezés Google-lel";
            if(userDisplay) userDisplay.textContent = "";
        }
    });


    // Gomb eseményfigyelője
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                console.log("Kijelentkezés...");
                signOut(auth);
            } else {
                console.log("Bejelentkezés átirányítással...");
                signInWithRedirect(auth, provider);
            }
        });
    } else {
        console.error("KRITIKUS HIBA: Az 'auth-btn' gomb nem található!");
    }
});