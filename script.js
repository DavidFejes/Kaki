// ==========================================================
// ||     A KAKI NAPLÓ v3.5 - FEJLETT SZŰRÉSSEL            ||
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyDDHmub6fyzV7tEZ0lyYYVHEDYGnR4xiYI",
  authDomain: "kaki-b14a4.firebaseapp.com",
  projectId: "kaki-b14a4",
  storageBucket: "kaki-b14a4.appspot.com",
  messagingSenderId: "123120220357",
  appId: "1:123120220357:web:3386a6b8ded6c4ec3798ac"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

let currentUser = null;
let logs = [];
let settings = { businessMode: false, hourlySalary: 0 };
let map = null;
let poopChart = null;
let weeklyChartOffset = 0;
let currentLogLocation = null;

// --- Auth gomb logika ---
const authBtn = document.getElementById('auth-btn');
const userDisplay = document.getElementById('user-display');

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Perzisztencia beállítása
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // Most már biztonságosan indíthatod a bejelentkezést
    console.log("Firebase Auth perzisztencia beállítva.");
  })
  .catch((error) => {
    console.error("Hiba a Firebase Auth perzisztencia beállításakor:", error);
  });

export async function signInWithGooglePopup() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Sikeres bejelentkezés (popup):", user);
    return user;
  } catch (error) {
    console.error("Hiba a Google bejelentkezés (popup) során:", error);
    alert("Bejelentkezési hiba: " + error.message);
    throw error;
  }
}

// Figyeld a hitelesítési állapot változását
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Felhasználó bejelentkezve (onAuthStateChanged):", user);
    // Frissítsd az UI-t, vagy navigálj
  } else {
    console.log("Nincs bejelentkezett felhasználó.");
  }
});

authBtn.addEventListener('click', () => {
  if (currentUser) {
    signOut(auth);
  } else {
    signInWithPopup(auth, provider).catch(e => {
      alert('Bejelentkezési hiba: ' + (e.message || e));
    });
  }
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    userDisplay.textContent = user.displayName || user.email;
    authBtn.textContent = 'Kijelentkezés';
    document.querySelector('.container').style.display = 'block';
    loadUserData();
  } else {
    userDisplay.textContent = '';
    authBtn.textContent = 'Bejelentkezés Google-lel';
    document.querySelector('.container').style.display = 'none';
    logs = [];
    if (map) { map.remove(); map = null; }
  }
});

// ...existing code...

    // === HTML ELEMEK ELÉRÉSE ===
    // ...existing code...
    const mainContainer = document.querySelector('.container'), viewSwitcher = document.querySelector('.view-switcher'),
          views = document.querySelectorAll('.view-content'), openLogModalBtn = document.getElementById('open-log-modal-btn'),
          todayCountEl = document.getElementById('today-count'), weeklyTotalEl = document.getElementById('weekly-total'),
          dailyAvgEl = document.getElementById('daily-avg'), allTimeTotalEl = document.getElementById('all-time-total'),
          earningsCard = document.getElementById('earnings-card'), workEarningsEl = document.getElementById('work-earnings'),
          peakDayEl = document.getElementById('peak-day'), chartCanvas = document.getElementById('log-chart').getContext('2d'),
          prevWeekBtn = document.getElementById('prev-week-btn'), nextWeekBtn = document.getElementById('next-week-btn'),
          weekDisplay = document.getElementById('week-display'), fullLogListEl = document.getElementById('full-log-list'),
          mapContainer = document.getElementById('map-container'), settingsBtn = document.getElementById('settings-btn'),
          settingsModal = document.getElementById('settings-modal'), logEntryModal = document.getElementById('log-entry-modal'),
          closeButtons = document.querySelectorAll('.close-btn'), businessModeToggle = document.getElementById('business-mode-toggle'),
          salaryInputGroup = document.getElementById('salary-input-group'), hourlySalaryInput = document.getElementById('hourly-salary'),
          saveSettingsBtn = document.getElementById('save-settings-btn'), saveLogBtn = document.getElementById('save-log-btn'),
          logDurationInput = document.getElementById('log-duration'), logDescriptionInput = document.getElementById('log-description'),
          logRatingInput = document.getElementById('log-rating'), workLogGroup = document.getElementById('work-log-group'),
          isWorkLogCheckbox = document.getElementById('is-work-log'), locationStatus = document.getElementById('location-status');

    // --- Ensure rating slider min/max/step are correct (must be after DOM elements are defined) ---
    if (logRatingInput) {
        logRatingInput.setAttribute('min', '1');
        logRatingInput.setAttribute('max', '5');
        logRatingInput.setAttribute('step', '1');
        // Always set value to 3 on load for consistency
        logRatingInput.value = '3';
        // Dinamikus csík: csak ez a blokk kell
        const updateRangePercent = () => {
            const min = Number(logRatingInput.min) || 1;
            const max = Number(logRatingInput.max) || 5;
            const val = Number(logRatingInput.value);
            const percent = ((val - min) / (max - min)) * 100;
            logRatingInput.style.setProperty('--percent', percent + '%');
        };
        updateRangePercent();
        logRatingInput.addEventListener('input', updateRangePercent);
    }

    // --- Auto-grow textarea for log description, only show scrollbar if max height reached ---
    if (logDescriptionInput) {
        const MAX_HEIGHT = 300;
        logDescriptionInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, MAX_HEIGHT);
            this.style.height = newHeight + 'px';
            // Hide overflow unless at max height
            if (this.scrollHeight > MAX_HEIGHT) {
                this.style.overflowY = 'auto';
            } else {
                this.style.overflowY = 'hidden';
            }
        });
        // Set initial height
        logDescriptionInput.style.height = 'auto';
        const initialHeight = Math.min(logDescriptionInput.scrollHeight, MAX_HEIGHT);
        logDescriptionInput.style.height = initialHeight + 'px';
        logDescriptionInput.style.overflowY = (logDescriptionInput.scrollHeight > MAX_HEIGHT) ? 'auto' : 'hidden';
    }
    
    // ÚJ: Szűrő elemek
    const filterDateStart = document.getElementById('filter-date-start'), filterDateEnd = document.getElementById('filter-date-end'),
          filterRating = document.getElementById('filter-rating'), filterDescription = document.getElementById('filter-description'),
          filterResetBtn = document.getElementById('filter-reset-btn'), logListCount = document.getElementById('log-list-count');
    
    // === FŐ LOGIKA: ESEMÉNYFIGYELŐK ===
    onAuthStateChanged(auth, u => {
        currentUser = u;
        const btn = document.getElementById('auth-btn');
        if (u) {
            mainContainer.style.display = 'block';
            btn.textContent = 'Kijelentkezés';
            userDisplay.textContent = `Üdv, ${u.displayName.split(' ')[0]}!`;
            loadUserData();
        } else {
            mainContainer.style.display = 'none';
            btn.textContent = 'Bejelentkezés Google-lel';
            userDisplay.textContent = '';
            logs = [];
            if (map) { map.remove(); map = null; }
        }
    });
    // Remove getRedirectResult, not needed for popup auth
    // Always remove previous click listeners before adding a new one
    authBtn.replaceWith(authBtn.cloneNode(true));
    const newAuthBtn = document.getElementById('auth-btn');
    newAuthBtn.addEventListener('click', () => {
        if (currentUser) {
            signOut(auth);
        } else {
            signInWithPopup(auth, provider).catch(e => {
                alert('Bejelentkezési hiba: ' + (e.message || e));
            });
        }
    });
    function openModal(modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(modal) {
        modal.classList.remove('show');
        // Only re-enable scroll if no other modal is open
        if (!document.querySelector('.modal.show')) {
            document.body.style.overflow = '';
        }
    }
    openLogModalBtn.addEventListener('click', () => {
        resetLogForm();
        getCurrentLocation();
        openModal(logEntryModal);
    });
    saveLogBtn.addEventListener('click', async () => {
        const newLog = { timestamp: Date.now(), duration: (Number(logDurationInput.value)||5)*60, description: logDescriptionInput.value.trim(), rating: Number(logRatingInput.value), isWork: settings.businessMode&&isWorkLogCheckbox.checked, location: currentLogLocation };
        logs.push(newLog); await saveData("GOMB_KATTINTAS"); closeModal(logEntryModal); renderEverything();
    });
    settingsBtn.addEventListener('click', () => {
        openModal(settingsModal);
    });
    businessModeToggle.addEventListener('change', () => { salaryInputGroup.style.display=businessModeToggle.checked ? 'block' : 'none'; });
    saveSettingsBtn.addEventListener('click', async () => {
        settings.businessMode=businessModeToggle.checked;
        settings.hourlySalary=Number(hourlySalaryInput.value)||0;
        await saveData("BEALLITASOK_MENTESE");
        closeModal(settingsModal);
        applySettingsToUI();
        renderDashboard();
    });
    viewSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('view-btn')) { const t=e.target.dataset.view; document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); views.forEach(v=>v.classList.toggle('active', v.id===t)); if (t==='map-view' && map) setTimeout(()=>map.invalidateSize(), 10); } });
    closeButtons.forEach(b => b.addEventListener('click', (e) => {
        closeModal(e.target.closest('.modal'));
    }));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal(e.target);
    });

    // ESC billentyűre zárja a modalt
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModalEl = document.querySelector('.modal.show');
            if (openModalEl) closeModal(openModalEl);
        }
    });
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
    function resetLogForm() {
        logDurationInput.value = "5";
        logDescriptionInput.value = "";
        logRatingInput.setAttribute('min', '1');
        logRatingInput.setAttribute('max', '5');
        logRatingInput.setAttribute('step', '1');
        logRatingInput.value = "3";
        // Frissítjük a csíkot is resetnél
        if (logRatingInput) {
            const min = Number(logRatingInput.min) || 1;
            const max = Number(logRatingInput.max) || 5;
            const val = Number(logRatingInput.value);
            const percent = ((val - min) / (max - min)) * 100;
            logRatingInput.style.setProperty('--percent', percent + '%');
        }
        isWorkLogCheckbox.checked = false;
        currentLogLocation = null;
        workLogGroup.style.display = settings.businessMode ? 'block' : 'none';
        locationStatus.textContent = 'Helyszín meghatározása...';
        locationStatus.style.color = 'var(--text-secondary)';
    }
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

// ...existing code...