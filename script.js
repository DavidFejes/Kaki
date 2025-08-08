// ==========================================================
// ||     A KAKI NAPLÓ v3.5 - FEJLETT SZŰRÉSSEL            ||
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, signOut, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

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

    const translations = {
    hu: { loading: "Alkalmazás betöltése...", page_title: "Felhőalapú Kaki Napló", main_title: "A Kaki Napló 💩", login_button: "Bejelentkezés Google-lel", logout_button: "Kijelentkezés", dashboard_view_btn: "Irányítópult", log_list_view_btn: "Részletes Napló", map_view_btn: "Térkép", log_new_event_btn: "Új Esemény Rögítése", stat_today: "Mai Számláló", stat_weekly: "Heti Összesítés", stat_daily_avg: "Napi Átlag", stat_total: "Összes Bejegyzés", stat_earnings: '"Kereset" a munkahelyi szünetekből', stat_peak_day: "Csúcs Nap", chart_title: "Heti Aktivitás", week_display: "{start} - {end}", current_week: "Aktuális hét", log_list_title: "Összes bejegyzés", filter_start_date: "Kezdődátum:", filter_end_date: "Végdátum:", filter_rating: "Értékelés:", filter_rating_all: "Mind", filter_description: "Keresés a leírásban:", filter_description_placeholder: "Kulcsszó...", filter_reset_btn: "Szűrők Törlése", filter_results: "Találatok:", map_title: "Események Térképe", settings_title: "Beállítások", settings_business_mode: "Munkahelyi Mód", settings_hourly_wage: "Órabéred (Ft)", settings_hourly_wage_placeholder: "Pl. 3000", new_log_title: "Új esemény", new_log_duration: "Időtartam (perc)", new_log_description: "Leírás, jegyzetek", new_log_rating: "Értékelés (1-5)", new_log_is_work: "Munkahelyi esemény volt?", location_fetching: "Helyszín meghatározása...", save_btn: "Mentés", log_btn: "Rögzítés", welcome_message: "Üdv, {userName}!", location_fetching_success: "✅ Helyszín rögzítve!", location_fetching_error: "⚠️ Helyszín nem elérhető.", location_fetching_unsupported: "Helymeghatározás nem támogatott.", log_description_work: "Munkahelyi", log_description_na: "N/A", chart_days: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'] },
    en: { loading: "Loading application...", page_title: "Cloud-Based Poop Log", main_title: "The Poop Log 💩", login_button: "Login with Google", logout_button: "Logout", dashboard_view_btn: "Dashboard", log_list_view_btn: "Detailed Log", map_view_btn: "Map", log_new_event_btn: "Log New Event", stat_today: "Today's Count", stat_weekly: "Weekly Total", stat_daily_avg: "Daily Average", stat_total: "All-Time Total", stat_earnings: '"Earnings" from work breaks', stat_peak_day: "Peak Day", chart_title: "Weekly Activity", week_display: "{start} - {end}", current_week: "Current week", log_list_title: "All Entries", filter_start_date: "Start Date:", filter_end_date: "End Date:", filter_rating: "Rating:", filter_rating_all: "All", filter_description: "Search in description:", filter_description_placeholder: "Keyword...", filter_reset_btn: "Reset Filters", filter_results: "Results:", map_title: "Map of Events", settings_title: "Settings", settings_business_mode: "Business Mode", settings_hourly_wage: "Your Hourly Wage ($)", settings_hourly_wage_placeholder: "e.g. 15", new_log_title: "New Event", new_log_duration: "Duration (minutes)", new_log_description: "Description, notes", new_log_rating: "Rating (1-5)", new_log_is_work: "Was this a work event?", location_fetching: "Fetching location...", save_btn: "Save", log_btn: "Log it", welcome_message: "Welcome, {userName}!", location_fetching_success: "✅ Location acquired!", location_fetching_error: "⚠️ Location not available.", location_fetching_unsupported: "Geolocation not supported.", log_description_work: "Work", log_description_na: "N/A", chart_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
};

    let currentUser = null;
    let logs = [];
    let settings = { businessMode: false, hourlySalary: 0 };
    let currentLogLocation = null;
    let weeklyChartOffset = 0;
    let map;
    let poopChart;

    // === HTML ELEMEK ELÉRÉSE ===
    const authBtn = document.getElementById('auth-btn'), userDisplay = document.getElementById('user-display'),
          mainContainer = document.querySelector('.container'), viewSwitcher = document.querySelector('.view-switcher'),
          views = document.querySelectorAll('.view-content'), openLogModalBtn = document.getElementById('open-log-modal-btn'),
          todayCountEl = document.getElementById('today-count'), weeklyTotalEl = document.getElementById('weekly-total'),
          dailyAvgEl = document.getElementById('daily-avg'), allTimeTotalEl = document.getElementById('all-time-total'),
          earningsCard = document.getElementById('earnings-card'), workEarningsEl = document.getElementById('work-earnings'),
          peakDayEl = document.getElementById('peak-day'), chartCanvas = document.getElementById('log-chart').getContext('2d'),
          prevWeekBtn = document.getElementById('prev-week-btn'), nextWeekBtn = document.getElementById('next-week-btn'),
          weekDisplay = document.getElementById('week-display'), fullLogListEl = document.getElementById('full-log-list'),
          mapContainer = document.getElementById('map-container'), settingsBtn = document.getElementById('settings-btn'),
          langToggleBtn = document.getElementById('lang-toggle-btn'),
          settingsModal = document.getElementById('settings-modal'), logEntryModal = document.getElementById('log-entry-modal'),
          closeButtons = document.querySelectorAll('.close-btn'), businessModeToggle = document.getElementById('business-mode-toggle'),
          salaryInputGroup = document.getElementById('salary-input-group'), hourlySalaryInput = document.getElementById('hourly-salary'),
          saveSettingsBtn = document.getElementById('save-settings-btn'), saveLogBtn = document.getElementById('save-log-btn'),
          logDurationInput = document.getElementById('log-duration'), logDescriptionInput = document.getElementById('log-description'),
          logRatingInput = document.getElementById('log-rating'), workLogGroup = document.getElementById('work-log-group'),
          isWorkLogCheckbox = document.getElementById('is-work-log'), locationStatus = document.getElementById('location-status');
    // === NYELV VÁLTÓ GOMB ===
    let currentLanguage = 'hu';
    function setLanguage(lang) {
        currentLanguage = lang;
        document.documentElement.lang = lang;
        langToggleBtn.textContent = lang === 'hu' ? 'EN' : 'HU';
        // Update all elements with data-translate-key
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.getAttribute('data-translate-key');
            if (!key) return;
            if (el.placeholder !== undefined && translations[lang][key]) {
                el.placeholder = translations[lang][key];
            } else if (translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });
        // Update auth button and user display
        if (currentUser) {
            authBtn.textContent = translations[lang].logout_button;
            userDisplay.textContent = translations[lang].welcome_message.replace('{userName}', currentUser.displayName ? currentUser.displayName.split(' ')[0] : '');
        } else {
            authBtn.textContent = translations[lang].login_button;
            userDisplay.textContent = '';
        }
        // Optionally rerender main content if needed
        if (mainContainer && mainContainer.style.display !== 'none') {
            renderEverything();
        }
    }
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            setLanguage(currentLanguage === 'hu' ? 'en' : 'hu');
        });
    }
    // Set initial language
    setLanguage('hu');
    
    // ÚJ: Szűrő elemek
    const filterDateStart = document.getElementById('filter-date-start'), filterDateEnd = document.getElementById('filter-date-end'),
          filterRating = document.getElementById('filter-rating'), filterDescription = document.getElementById('filter-description'),
          filterResetBtn = document.getElementById('filter-reset-btn'), logListCount = document.getElementById('log-list-count');
    
    // === FŐ LOGIKA: ESEMÉNYFIGYELŐK ===
    onAuthStateChanged(auth, u => { if (u) { currentUser=u; mainContainer.style.display='block'; authBtn.textContent='Kijelentkezés'; userDisplay.textContent=`Üdv, ${u.displayName.split(' ')[0]}!`; loadUserData(); } else { currentUser=null; mainContainer.style.display='none'; authBtn.textContent='Bejelentkezés Google-lel'; userDisplay.textContent=''; logs=[]; if (map) { map.remove(); map=null; } } });
    getRedirectResult(auth).catch(e => console.error("Visszairányítás hiba:", e.message));
    authBtn.addEventListener('click', () => { if (currentUser) signOut(auth); else signInWithRedirect(auth, provider); });
    openLogModalBtn.addEventListener('click', () => { resetLogForm(); getCurrentLocation(); logEntryModal.style.display='block'; });
    saveLogBtn.addEventListener('click', async () => {
        const newLog = { timestamp: Date.now(), duration: (Number(logDurationInput.value)||5)*60, description: logDescriptionInput.value.trim(), rating: Number(logRatingInput.value), isWork: settings.businessMode&&isWorkLogCheckbox.checked, location: currentLogLocation };
        logs.push(newLog); await saveData("GOMB_KATTINTAS"); logEntryModal.style.display='none'; renderEverything();
    });
    settingsBtn.addEventListener('click', () => { settingsModal.style.display='block'; });
    businessModeToggle.addEventListener('change', () => { salaryInputGroup.style.display=businessModeToggle.checked ? 'block' : 'none'; });
    saveSettingsBtn.addEventListener('click', async () => { settings.businessMode=businessModeToggle.checked; settings.hourlySalary=Number(hourlySalaryInput.value)||0; await saveData("BEALLITASOK_MENTESE"); settingsModal.style.display='none'; applySettingsToUI(); renderDashboard(); });
    viewSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('view-btn')) { const t=e.target.dataset.view; document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); views.forEach(v=>v.classList.toggle('active', v.id===t)); if (t==='map-view' && map) setTimeout(()=>map.invalidateSize(), 10); } });
    closeButtons.forEach(b => b.addEventListener('click', (e) => e.target.closest('.modal').style.display='none'));
    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.style.display='none'; });
    fullLogListEl.addEventListener('click', async (e) => { const b=e.target.closest('.delete-btn'); if (!b) return; const t=Number(b.dataset.timestamp); logs=logs.filter(l=>l.timestamp!==t); await saveData("ELEM_TORLESE"); renderEverything(); });
    prevWeekBtn.addEventListener('click', () => { weeklyChartOffset--; renderDashboard(); });
    nextWeekBtn.addEventListener('click', () => { if(weeklyChartOffset<0){weeklyChartOffset++; renderDashboard();} });
    // ÚJ: Eseményfigyelők a szűrőkhöz
    [filterDateStart, filterDateEnd, filterRating].forEach(el => el.addEventListener('change', renderLogListPage));
    filterDescription.addEventListener('input', renderLogListPage);
    filterResetBtn.addEventListener('click', () => { filterDateStart.value=''; filterDateEnd.value=''; filterRating.value=0; filterDescription.value=''; renderLogListPage(); });
    
    // === FŐ FÜGGVÉNYEK ===
    async function loadUserData() {
        if (!currentUser) return; const docRef = doc(db,'users',currentUser.uid);
        try { const d=await getDoc(docRef); if (d.exists()){const data=d.data();logs=data.poopLogs||[]; settings={...{businessMode:false, hourlySalary:0}, ...data.settings}; if (logs.length>0 && typeof logs[0]==='number'){console.log("Migráció...");logs=logs.map(t=>({timestamp:t, duration:300, rating:3, description:"Régi adat",isWork:false,location:null}));await saveData("MIGRACIO");console.log("Migráció kész.");}} else {logs=[];settings={businessMode:false, hourlySalary:0};} renderEverything();
        } catch(e){console.error("Adatbetöltési hiba:", e);}
    }
    async function saveData(source="ismeretlen") { if (!currentUser) return; const docRef=doc(db,'users',currentUser.uid); try { await setDoc(docRef, {poopLogs:logs,settings}); console.log(`[${source}] Mentés sikeres.`);} catch(e){console.error(`[${source}] Mentési hiba:`,e);}}
    function resetLogForm() { logDurationInput.value="5"; logDescriptionInput.value=""; logRatingInput.value="3"; isWorkLogCheckbox.checked=false; currentLogLocation=null; workLogGroup.style.display=settings.businessMode?'block':'none'; locationStatus.textContent='Helyszín meghatározása...';locationStatus.style.color='var(--text-secondary)';}
    function getCurrentLocation() { if ('geolocation' in navigator) navigator.geolocation.getCurrentPosition(p=>{currentLogLocation={lat:p.coords.latitude,lng:p.coords.longitude};locationStatus.textContent='✅ Helyszín rögzítve!';locationStatus.style.color='lightgreen';},()=>{currentLogLocation=null;locationStatus.textContent='⚠️ Helyszín nem elérhető.';locationStatus.style.color='orange';}); else locationStatus.textContent='Helymeghatározás nem támogatott.';locationStatus.style.color='orange';}
    function renderEverything() { weeklyChartOffset=0; applySettingsToUI(); renderDashboard(); renderLogListPage(); initMap(); }
    function renderDashboard() { if(!currentUser)return;const s=calculateStats(weeklyChartOffset);todayCountEl.textContent=s.todayCount;weeklyTotalEl.textContent=s.thisWeekCount;dailyAvgEl.textContent=s.dailyAverage.toFixed(1);allTimeTotalEl.textContent=logs.length;workEarningsEl.textContent=`${s.workEarnings.toFixed(0)} Ft`;peakDayEl.textContent=s.peakDay.date||'-';renderChart(s.weeklyChartData);const sd=new Date(s.startOfWeek),ed=new Date(s.endOfWeek);weekDisplay.textContent=`${sd.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})} - ${ed.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})}`;nextWeekBtn.disabled=weeklyChartOffset>=0;}
    function applyFilters() { const sD=filterDateStart.valueAsNumber||0, eD=filterDateEnd.valueAsNumber?new Date(filterDateEnd.value).setHours(23,59,59,999):Infinity, mR=Number(filterRating.value),sT=filterDescription.value.toLowerCase(); return logs.filter(l=>{if(l.timestamp<sD||l.timestamp>eD)return false;if((l.rating||0)<mR)return false;if(sT&&!l.description.toLowerCase().includes(sT))return false;return true;});}
    function renderLogListPage() { const filteredLogs=applyFilters();logListCount.textContent=filteredLogs.length;fullLogListEl.innerHTML=filteredLogs.sort((a,b)=>b.timestamp-a.timestamp).map(l=>{const d=new Date(l.timestamp);let dt=`<span><i class="fas fa-clock"></i> ${(l.duration/60).toFixed(0)}p</span> <span><i class="fas fa-star"></i> ${l.rating||'N/A'}</span>`;if(l.isWork)dt+=`<span><i class="fas fa-briefcase"></i> Mhelyi</span>`;if(l.description)dt+=`<br><i>${l.description}</i>`;return `<li class="log-item" id="log-${l.timestamp}"><div class="log-item-main">${d.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div><div class="log-item-details">${dt}</div><button class="delete-btn" data-timestamp="${l.timestamp}"><i class="fas fa-trash"></i></button></li>`;}).join('');}
    function calculateStats(wO=0) { const n=new Date();n.setDate(n.getDate()+(wO*7));const dW=n.getDay(),df=n.getDate()-dW+(dW===0?-6:1),sW=new Date(new Date(n).setDate(df)).setHours(0,0,0,0),eW=new Date(sW).setHours(23,59,59,999)+6*864e5,wCD=Array(7).fill(0);logs.filter(l=>l.timestamp>=sW&&l.timestamp<=eW).forEach(l=>{let dI=new Date(l.timestamp).getDay();dI=dI===0?6:dI-1;wCD[dI]++;});let pD={date:null,count:0};if(logs.length>0){const cBD=logs.reduce((a,l)=>{const d=new Date(l.timestamp).toLocaleDateString('hu-HU');a[d]=(a[d]||0)+1;return a;},{});for(const d in cBD)if(cBD[d]>pD.count)pD={date:`${d}(${cBD[d]}x)`,count:cBD[d]};}let dA=0;if(logs.length>0){const fLT=logs.reduce((m,l)=>l.timestamp<m?l.timestamp:m,Date.now()),dSF=Math.ceil((Date.now()-fLT)/864e5)||1;dA=logs.length/dSF;}return{todayCount:logs.filter(l=>l.timestamp>=new Date().setHours(0,0,0,0)).length,thisWeekCount:logs.filter(l=>l.timestamp>=sW&&l.timestamp<=eW).length,dailyAverage:dA,workEarnings:logs.filter(l=>l.isWork&&settings.hourlySalary>0).reduce((s,l)=>s+(l.duration/3600)*settings.hourlySalary,0),weeklyChartData:wCD,peakDay:pD,startOfWeek:sW,endOfWeek:eW};}
    function renderChart(d) {if(poopChart)poopChart.destroy();poopChart=new Chart(chartCanvas,{type:'bar',data:{labels:['H','K','Sze','Cs','P','Szo','V'],datasets:[{data:d,backgroundColor:'rgba(212,172,110,0.5)',borderColor:'rgba(212,172,110,1)',borderWidth:1,borderRadius:5}]},options:{scales:{y:{beginAtZero:true,ticks:{stepSize:1,color:'#b0a299'}},x:{ticks:{color:'#b0a299'}}},plugins:{legend:{display:false}}}});}
    function initMap(){if(mapContainer&&!map){map=L.map('map-container').setView([47.4979,19.0402],7);L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy;OSM &copy;CARTO',maxZoom:20}).addTo(map);}if(map)renderAllMarkers();}
    function renderAllMarkers(){if(!map)return;map.eachLayer(l=>{if(l instanceof L.Marker)map.removeLayer(l);});logs.forEach(l=>{if(l.location){const d=new Date(l.timestamp),pC=`<b>${d.toLocaleString('hu-HU')}</b><br>${l.description||'Nincs leírás.'}`;L.marker([l.location.lat,l.location.lng]).addTo(map).bindPopup(pC);}});}
    function applySettingsToUI(){businessModeToggle.checked=settings.businessMode;hourlySalaryInput.value=settings.hourlySalary||'';salaryInputGroup.style.display=settings.businessMode?'block':'none';earningsCard.style.display=settings.businessMode?'grid':'none';}

});