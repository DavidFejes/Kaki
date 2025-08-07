// ==========================================================
// ||     A KAKI NAPLÓ v3.2 - ATOMBIZTOS VERZIÓ           ||
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let logs = [];
let settings = { businessMode: false, hourlySalary: 0 };
let currentLogLocation = null;
let weeklyChartOffset = 0;
let map;
let poopChart;

function initializeAppLogic() {
    console.log("DOM betöltődött, az alkalmazás logikája indul.");

    const authBtn = document.getElementById('auth-btn');
    const userDisplay = document.getElementById('user-display');
    const mainContainer = document.querySelector('.container');
    const openLogModalBtn = document.getElementById('open-log-modal-btn');
    const saveLogBtn = document.getElementById('save-log-btn');

    if (!saveLogBtn) {
        alert("KRITIKUS HIBA: A 'save-log-btn' gomb nem található a HTML-ben!");
        return;
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            mainContainer.style.display = 'block';
            authBtn.textContent = 'Kijelentkezés';
            userDisplay.textContent = `Üdv, ${user.displayName.split(' ')[0]}!`;
            loadUserData();
        } else {
            // ... (A kijelentkezési logika marad a régiben)
        }
    });

    authBtn.addEventListener('click', () => {
        if (currentUser) signOut(auth);
        else signInWithPopup(auth, provider).catch(error => console.error("Bejelentkezési hiba:", error));
    });

    openLogModalBtn.addEventListener('click', () => {
        // ... (A modal megnyitó logika)
    });

    saveLogBtn.addEventListener('click', async () => {
        console.log("Rögzítés gomb kattintás észlelve!");
        alert('A Rögzítés gomb MŰKÖDIK! A mentési logika most lefut.');

        const newLog = {
            timestamp: Date.now(),
            duration: (Number(document.getElementById('log-duration').value) || 5) * 60,
            description: document.getElementById('log-description').value.trim(),
            rating: Number(document.getElementById('log-rating').value),
            isWork: settings.businessMode && document.getElementById('is-work-log').checked,
            location: currentLogLocation
        };
        logs.push(newLog);
        
        await saveData("GOMB_KATTINTAS");

        document.getElementById('log-entry-modal').style.display = 'none';
        renderEverything(); // Egyszerűsített render hívás
    });
    
    // ... Az összes többi függvény és eseménykezelő itt lenne...
    // (A teljesség igénye nélkül, mivel a fókusz a gomb működésén van)

}

async function saveData(source = "ISMERETLEN") {
    if (!currentUser) {
        console.error("Mentési hiba: nincs felhasználó!");
        return;
    }
    const docRef = doc(db, 'users', currentUser.uid);
    try {
        await setDoc(docRef, { poopLogs: logs, settings: settings });
        console.log(`[MENTÉS - ${source}] Sikeres mentés!`);
    } catch (error) {
        console.error(`[MENTÉS - ${source}] HIBA:`, error);
    }
}

function renderEverything() {
    // Ide jönne az összes renderDashboard(), renderLogListPage() stb. hívás
    console.log("Renderelés elindult...");
}


// A szkript belépési pontja
document.addEventListener('DOMContentLoaded', initializeAppLogic);