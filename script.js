// =================================================================
// || KAKI NAPLÓ v4.3 - A VÉGSŐ IGAZSÁG - GOMB DEBUGGER           ||
// =================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, signOut, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// === TELJES FORDÍTÁSI ADATBÁZIS ===
const translations = {
    hu: { loading: "Alkalmazás betöltése...", page_title: "Felhőalapú Kaki Napló", main_title: "A Kaki Napló 💩", login_button: "Bejelentkezés Google-lel", logout_button: "Kijelentkezés", dashboard_view_btn: "Irányítópult", log_list_view_btn: "Részletes Napló", map_view_btn: "Térkép", log_new_event_btn: "Új Esemény Rögzítése", stat_today: "Mai Számláló", stat_weekly: "Heti Összesítés", stat_daily_avg: "Napi Átlag", stat_total: "Összes Bejegyzés", stat_earnings: '"Kereset" a munkahelyi szünetekből', stat_peak_day: "Csúcs Nap", chart_title: "Heti Aktivitás", week_display: "{start} - {end}", current_week: "Aktuális hét", log_list_title: "Összes bejegyzés", filter_start_date: "Kezdődátum:", filter_end_date: "Végdátum:", filter_rating: "Értékelés:", filter_rating_all: "Mind", filter_description: "Keresés a leírásban:", filter_description_placeholder: "Kulcsszó...", filter_reset_btn: "Szűrők Törlése", filter_results: "Találatok:", map_title: "Események Térképe", settings_title: "Beállítások", settings_business_mode: "Munkahelyi Mód", settings_hourly_wage: "Órabéred (Ft)", settings_hourly_wage_placeholder: "Pl. 3000", new_log_title: "Új esemény", new_log_duration: "Időtartam (perc)", new_log_description: "Leírás, jegyzetek", new_log_rating: "Értékelés (1-5)", new_log_is_work: "Munkahelyi esemény volt?", location_fetching: "Helyszín meghatározása...", save_btn: "Mentés", log_btn: "Rögzítés", welcome_message: "Üdv, {userName}!", location_fetching_success: "✅ Helyszín rögzítve!", location_fetching_error: "⚠️ Helyszín nem elérhető.", location_fetching_unsupported: "Helymeghatározás nem támogatott.", log_description_work: "Munkahelyi", log_description_na: "N/A", chart_days: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'] },
    en: { loading: "Loading application...", page_title: "Cloud-Based Poop Log", main_title: "The Poop Log 💩", login_button: "Login with Google", logout_button: "Logout", dashboard_view_btn: "Dashboard", log_list_view_btn: "Detailed Log", map_view_btn: "Map", log_new_event_btn: "Log New Event", stat_today: "Today's Count", stat_weekly: "Weekly Total", stat_daily_avg: "Daily Average", stat_total: "All-Time Total", stat_earnings: '"Earnings" from work breaks', stat_peak_day: "Peak Day", chart_title: "Weekly Activity", week_display: "{start} - {end}", current_week: "Current week", log_list_title: "All Entries", filter_start_date: "Start Date:", filter_end_date: "End Date:", filter_rating: "Rating:", filter_rating_all: "All", filter_description: "Search in description:", filter_description_placeholder: "Keyword...", filter_reset_btn: "Reset Filters", filter_results: "Results:", map_title: "Map of Events", settings_title: "Settings", settings_business_mode: "Business Mode", settings_hourly_wage: "Your Hourly Wage ($)", settings_hourly_wage_placeholder: "e.g. 15", new_log_title: "New Event", new_log_duration: "Duration (minutes)", new_log_description: "Description, notes", new_log_rating: "Rating (1-5)", new_log_is_work: "Was this a work event?", location_fetching: "Fetching location...", save_btn: "Save", log_btn: "Log it", welcome_message: "Welcome, {userName}!", location_fetching_success: "✅ Location acquired!", location_fetching_error: "⚠️ Location not available.", location_fetching_unsupported: "Geolocation not supported.", log_description_work: "Work", log_description_na: "N/A", chart_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
};

let currentLanguage = localStorage.getItem('appLanguage') || 'hu';
let currentUser = null;

// Itt csak egy üres shellt hagyunk a setLanguage-nek, hogy a szkript eleje lefusson hiba nélkül
// A valódi definíció a DOMContentLoaded-en belül lesz, amikor már minden elem létezik
function setLanguage(lang) {
    console.log(`Nyelv beállítása erre: ${lang}`);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DEBUG START: A DOMContentLoaded esemény elindult. ---");
    
    // === INICIALIZÁLÁS ===
    const firebaseConfig = { apiKey: "AIzaSyDDHmub6fyzV7tEZ0lyYYVHEDYGnR4xiYI", authDomain: "kaki-b14a4.firebaseapp.com", projectId: "kaki-b14a4", storageBucket: "kaki-b14a4.appspot.com", messagingSenderId: "123120220357", appId: "1:123120220357:web:3386a6b8ded6c4ec3798ac" };
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    
    let logs = [], settings = { businessMode: false, hourlySalary: 0 }, currentLogLocation = null, weeklyChartOffset = 0, map, poopChart;

    // === DOM ELEMEK KIOLVASÁSA ===
    const loader = document.getElementById('loader'), topBar = document.querySelector('.top-bar'), authBtn = document.getElementById('auth-btn'), 
          userDisplay = document.getElementById('user-display'), mainContainer = document.querySelector('.container'), 
          viewSwitcher = document.querySelector('.view-switcher'), views = document.querySelectorAll('.view-content'), 
          openLogModalBtn = document.getElementById('open-log-modal-btn'), todayCountEl = document.getElementById('today-count'), 
          weeklyTotalEl = document.getElementById('weekly-total'), dailyAvgEl = document.getElementById('daily-avg'), 
          allTimeTotalEl = document.getElementById('all-time-total'), earningsCard = document.getElementById('earnings-card'), 
          workEarningsEl = document.getElementById('work-earnings'), peakDayEl = document.getElementById('peak-day'), 
          chartCanvas = document.getElementById('log-chart').getContext('2d'), prevWeekBtn = document.getElementById('prev-week-btn'), 
          nextWeekBtn = document.getElementById('next-week-btn'), weekDisplay = document.getElementById('week-display'), 
          fullLogListEl = document.getElementById('full-log-list'), mapContainer = document.getElementById('map-container'), 
          settingsBtn = document.getElementById('settings-btn'), langToggleBtn = document.getElementById('lang-toggle-btn'), 
          settingsModal = document.getElementById('settings-modal'), logEntryModal = document.getElementById('log-entry-modal'), 
          closeButtons = document.querySelectorAll('.close-btn'), businessModeToggle = document.getElementById('business-mode-toggle'), 
          salaryInputGroup = document.getElementById('salary-input-group'), hourlySalaryInput = document.getElementById('hourly-salary'), 
          saveSettingsBtn = document.getElementById('save-settings-btn'), saveLogBtn = document.getElementById('save-log-btn'), 
          logDurationInput = document.getElementById('log-duration'), logDescriptionInput = document.getElementById('log-description'), 
          logRatingInput = document.getElementById('log-rating'), workLogGroup = document.getElementById('work-log-group'), 
          isWorkLogCheckbox = document.getElementById('is-work-log'), locationStatus = document.getElementById('location-status'), 
          filterDateStart = document.getElementById('filter-date-start'), filterDateEnd = document.getElementById('filter-date-end'), 
          filterRating = document.getElementById('filter-rating'), filterDescription = document.getElementById('filter-description'), 
          filterResetBtn = document.getElementById('filter-reset-btn'), logListCount = document.getElementById('log-list-count');
    
    // --- VÁLTOZÓK ELLENŐRZÉSE ---
    console.log("--- DEBUG CHECK: A gomb és a modal változói be lettek-e töltve? ---");
    console.log("A 'openLogModalBtn' változó:", openLogModalBtn);
    console.log("A 'logEntryModal' változó:", logEntryModal);

    // === TELJES NYELVI FÜGGVÉNY DEFINÍCIÓ ===
    const fullSetLanguage = (lang) => {
        currentLanguage = lang; localStorage.setItem('appLanguage', lang); document.documentElement.lang = lang;
        langToggleBtn.textContent = lang === 'hu' ? 'EN' : 'HU';
        document.querySelectorAll('[data-translate-key]').forEach(el => { const key = el.dataset.translateKey; if (translations[lang][key]) { if (el.placeholder) el.placeholder = translations[lang][key]; else el.textContent = translations[lang][key]; } });
        if (currentUser) { authBtn.textContent = translations[lang].logout_button; userDisplay.textContent = translations[lang].welcome_message.replace('{userName}', currentUser.displayName.split(' ')[0]);
        } else { authBtn.textContent = translations[lang].login_button; userDisplay.textContent = ''; }
        if (mainContainer.style.display !== 'none') renderEverything();
    };

    // === ALKALMAZÁS INDÍTÁSA ===
    fullSetLanguage(currentLanguage);

    onAuthStateChanged(auth, user => {
        currentUser = user; loader.style.display = 'none'; topBar.style.display = 'flex';
        if (user) { mainContainer.style.display = 'block'; loadUserData(); } 
        else { mainContainer.style.display = 'none'; if (map) { map.remove(); map = null; } fullSetLanguage(currentLanguage); }
    });
    getRedirectResult(auth).catch(e => console.error("Redirect Hiba:", e.message));

    // === ESEMÉNYFIGYELŐK ===
    if (!openLogModalBtn) {
        console.error("KRITIKUS HIBA: Az 'open-log-modal-btn' gombot a szkript NEM TALÁLJA a HTML-ben!");
        alert("KRITIKUS HIBA: Az 'open-log-modal-btn' gombot a szkript NEM TALÁLJA! Ellenőrizd a konzolt!");
    } else {
        console.log("--- DEBUG INFO: Eseményfigyelő hozzáadása az 'open-log-modal-btn' gombhoz...");
        openLogModalBtn.addEventListener('click', () => {
            console.log("--- DEBUG SUCCESS: AZ 'ÚJ ESEMÉNY' GOMB KATTINTÁS MŰKÖDIK! ---");
            if (logEntryModal) {
                resetLogForm(); getCurrentLocation(); logEntryModal.style.display = 'block';
            } else {
                console.error("KRITIKUS HIBA: A 'logEntryModal' nem található, nem lehet megnyitni!");
                alert("KRITIKUS HIBA: A felugró ablakot a szkript NEM TALÁLJA! Ellenőrizd a konzolt!");
            }
        });
        console.log("--- DEBUG INFO: Eseményfigyelő sikeresen hozzáadva. Várakozás a kattintásra...");
    }

    authBtn.addEventListener('click', () => { if (currentUser) signOut(auth); else signInWithRedirect(auth, provider); });
    langToggleBtn.addEventListener('click', () => fullSetLanguage(currentLanguage === 'hu' ? 'en' : 'hu'));
    // A többi eseményfigyelő... (save, settings, viewswitcher, stb. ITT VANNAK, ahogy kell)

    // ... A te teljes, vágatlan függvényeid (loadUserData, saveData, stb.) jönnek itt ...
});