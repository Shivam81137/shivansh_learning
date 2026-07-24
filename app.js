/* ============================================================
   SHIVANSH'S STUDY HUB — app.js  v4.0
   7 Subjects: Maths, Chem, Phys, Bio, History, Geo, Computer
   ============================================================ */

// ── Subject & chapter definitions ─────────────────────────
const SUBJECTS = {
  maths: { name: 'Mathematics', total: 7,  badge: 'maths-badge', prog: 'prog-maths', chevron: 'schev-maths', body: 'sbody-maths', chapters: ['m4','m5','m6','m7','m8','m9','m10'] },
  eng:   { name: 'English',     total: 11, badge: 'eng-badge',   prog: 'prog-eng',   chevron: 'schev-eng',   body: 'sbody-eng',   chapters: ['e7','e8','e9','e10','e11','e12','e13','e22','e25','e27','e28'] },
  chem:  { name: 'Chemistry',   total: 2,  badge: 'chem-badge',  prog: 'prog-chem',  chevron: 'schev-chem',  body: 'sbody-chem',  chapters: ['c2','c3'] },
  phys:  { name: 'Physics',     total: 2,  badge: 'phys-badge',  prog: 'prog-phys',  chevron: 'schev-phys',  body: 'sbody-phys',  chapters: ['p2','p3'] },
  bio:   { name: 'Biology',     total: 2,  badge: 'bio-badge',   prog: 'prog-bio',   chevron: 'schev-bio',   body: 'sbody-bio',   chapters: ['b3','b4'] },
  hist:  { name: 'History',     total: 4,  badge: 'hist-badge',  prog: 'prog-hist',  chevron: 'schev-hist',  body: 'sbody-hist',  chapters: ['h2','h3','h4','h5'] },
  geo:   { name: 'Geography',   total: 3,  badge: 'geo-badge',   prog: 'prog-geo',   chevron: 'schev-geo',   body: 'sbody-geo',   chapters: ['g3','g4','g5'] },
  comp:  { name: 'Computer',    total: 2,  badge: 'comp-badge',  prog: 'prog-comp',  chevron: 'schev-comp',  body: 'sbody-comp',  chapters: ['cp3','cp5'] },
};

const ALL_CHAPTER_IDS = Object.values(SUBJECTS).flatMap(s => s.chapters);
const TOTAL_CHAPTERS = ALL_CHAPTER_IDS.length; // 22

// ── All Photos for Gallery & Daily Rotation ─────────────
const SHIVANSH_PHOTOS = [
  "photos/logo_v2.png",
  "photos/20260713_114519-IMG_STYLE.jpg",
  "photos/20260713_114401-IMG_STYLE.jpg",
  "photos/20260713_123415-IMG_STYLE.jpg",
  "photos/20260716_091301-IMG_STYLE.jpg",
  "photos/20260716_091503-IMG_STYLE.jpg",
  "photos/IMG_20250714_102124171.jpg",
  "photos/IMG_20250714_102135846.jpg",
  "photos/IMG_20251020_192850687.jpg",
  "photos/IMG_20251021_172955162_HDR.jpg",
  "photos/IMG_20251025_203727.jpg",
  "photos/IMG_20251227_172100368.jpg",
  "photos/IMG_20260226_185802323.jpg",
  "photos/IMG_20260408_202742608_MP.jpg",
  "photos/IMG_20260528_114814926_HDR.jpg",
  "photos/IMG_20260528_184846544.jpg",
  "photos/IMG_20260627_102617982_MP.jpg",
  "photos/IMG_20260627_110112829_MP.jpg",
  "photos/IMG_20260627_111941224_MP.jpg",
  "photos/IMG_20260627_112428956_MP.jpg",
  "photos/IMG_20260627_113101743_MP.jpg",
  "photos/IMG_20260627_123805992.jpg",
  "photos/IMG_20260702_212248212_MP.jpg"
];

function getDailyPhotoIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % SHIVANSH_PHOTOS.length;
}

function updateDailyAvatar() {
  const avatar = document.getElementById('heroAvatar');
  if (avatar) {
    const dailyIdx = getDailyPhotoIndex();
    avatar.src = SHIVANSH_PHOTOS[dailyIdx];
  }
}

// ── Persistent state ──────────────────────────────────────
let doneSet = new Set(JSON.parse(localStorage.getItem('shivansh_done_v2') || '[]'));
let doneDates = JSON.parse(localStorage.getItem('shivansh_done_dates') || '{}');

// Migrate legacy doneSet data to doneDates if missing
if (doneSet.size > 0 && Object.keys(doneDates).length === 0) {
  const todayISO = new Date().toISOString();
  doneSet.forEach(id => doneDates[id] = todayISO);
  localStorage.setItem('shivansh_done_dates', JSON.stringify(doneDates));
}

let openSubjects = new Set();
let openCard = null; // only one chapter open at a time

// ── PWA & Service Worker Registration ────────────────────
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  checkAndShowPwaPopup();
});

function checkAndShowPwaPopup() {
  const dismissedTime = parseInt(localStorage.getItem('shivansh_pwa_dismissed') || '0');
  const now = Date.now();
  // Show popup if not dismissed in last 3 days and not already running standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone && (now - dismissedTime > 3 * 24 * 60 * 60 * 1000)) {
    setTimeout(() => {
      document.getElementById('pwaInstallPopup')?.classList.add('show');
    }, 1200);
  }
}

function installPwaApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('🎉 App installing to Home Screen!');
      }
      deferredPrompt = null;
      dismissPwaPopup();
    });
  } else {
    // Mobile Safari / iOS or Browser fallback guide
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      alert("📲 To Install on iPhone / iPad:\n\n1. Tap the Share button (⎋) at the bottom\n2. Scroll down and tap 'Add to Home Screen ➕'");
    } else {
      showToast("📲 Tap Chrome menu (⋮) -> 'Install App' or 'Add to Home screen'");
    }
    dismissPwaPopup();
  }
}

function dismissPwaPopup() {
  document.getElementById('pwaInstallPopup')?.classList.remove('show');
  localStorage.setItem('shivansh_pwa_dismissed', Date.now());
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDoneState();
  updateAllProgress();
  if (typeof renderProgressChart === 'function') {
    // Slight delay to ensure canvas is painted and Chart.js loaded
    setTimeout(() => renderProgressChart(), 50);
  }
  checkAndShowPwaPopup();
});

// ═══════════════════════════════════════════════
//  SUBJECT TOGGLE (accordion — one at a time)
// ═══════════════════════════════════════════════
function toggleSubject(subjId) {
  const body  = document.getElementById(`sbody-${subjId}`);
  const chev  = document.getElementById(`schev-${subjId}`);
  if (!body) return;

  const isOpen = openSubjects.has(subjId);

  // Close all other subjects
  openSubjects.forEach(id => {
    if (id !== subjId) {
      document.getElementById(`sbody-${id}`)?.classList.remove('open');
      document.getElementById(`schev-${id}`)?.classList.remove('open');
    }
  });
  openSubjects.clear();

  // Also close any open chapter card
  if (openCard) {
    document.getElementById(`body-${openCard}`)?.classList.remove('open');
    document.getElementById(`chev-${openCard}`)?.classList.remove('open');
    openCard = null;
  }

  if (!isOpen) {
    body.classList.add('open');
    chev?.classList.add('open');
    openSubjects.add(subjId);
    setTimeout(() => body.parentElement.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
  } else {
    body.classList.remove('open');
    chev?.classList.remove('open');
  }
}

// ═══════════════════════════════════════════════
//  CHAPTER TOGGLE
// ═══════════════════════════════════════════════
function toggleCard(id) {
  const body = document.getElementById(`body-${id}`);
  const chev = document.getElementById(`chev-${id}`);
  if (!body) return;

  const isOpen = openCard === id;

  // Close previous chapter
  if (openCard && openCard !== id) {
    document.getElementById(`body-${openCard}`)?.classList.remove('open');
    document.getElementById(`chev-${openCard}`)?.classList.remove('open');
  }

  if (!isOpen) {
    body.classList.add('open');
    chev?.classList.add('open');
    openCard = id;
    setTimeout(() => body.parentElement.scrollIntoView({ behavior:'smooth', block:'nearest' }), 60);
  } else {
    body.classList.remove('open');
    chev?.classList.remove('open');
    openCard = null;
  }
}

// ═══════════════════════════════════════════════
//  DONE / COMPLETION
// ═══════════════════════════════════════════════
function toggleDone(id, event) {
  event.stopPropagation();
  const btn  = document.getElementById(`done-${id}`);
  const card = document.getElementById(`card-${id}`);
  if (!btn) return;

  if (doneSet.has(id)) {
    doneSet.delete(id);
    delete doneDates[id];
    btn.classList.remove('done');
    btn.textContent = '○';
    card?.classList.remove('done-card');
  } else {
    doneSet.add(id);
    doneDates[id] = new Date().toISOString();
    btn.classList.add('done');
    btn.textContent = '✓';
    card?.classList.add('done-card');
    launchConfetti();
    showToast(`🎉 Chapter done! Great work, Shivansh! 💪`);
  }

  localStorage.setItem('shivansh_done_v2', JSON.stringify([...doneSet]));
  localStorage.setItem('shivansh_done_dates', JSON.stringify(doneDates));
  updateAllProgress();
  if (typeof renderProgressChart === 'function') renderProgressChart();
}

function renderDoneState() {
  doneSet.forEach(id => {
    const btn  = document.getElementById(`done-${id}`);
    const card = document.getElementById(`card-${id}`);
    if (btn)  { btn.classList.add('done'); btn.textContent = '✓'; }
    if (card) card.classList.add('done-card');
  });
}

// ═══════════════════════════════════════════════
//  PROGRESS
// ═══════════════════════════════════════════════
function updateAllProgress() {
  const totalDone = doneSet.size;

  // Hero count
  const el = document.getElementById('doneCount');
  if (el) animateCount(el, parseInt(el.textContent) || 0, totalDone);

  // Overall bar
  const pct = Math.round((totalDone / TOTAL_CHAPTERS) * 100);
  const fill = document.getElementById('overallFill');
  const pctEl = document.getElementById('overallPct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = `${totalDone} / ${TOTAL_CHAPTERS} chapters complete`;

  // Per-subject bars & badges
  Object.entries(SUBJECTS).forEach(([subjId, subj]) => {
    const doneCount = subj.chapters.filter(c => doneSet.has(c)).length;
    const pct = Math.round((doneCount / subj.total) * 100);

    const progEl  = document.getElementById(subj.prog);
    const badgeEl = document.getElementById(subj.badge);
    if (progEl)  progEl.style.width  = pct + '%';
    if (badgeEl) badgeEl.textContent = `${doneCount} / ${subj.total}`;
  });
}

function animateCount(el, from, to) {
  if (from === to) return;
  const step = to > from ? 1 : -1;
  let cur = from;
  const timer = setInterval(() => {
    cur += step;
    el.textContent = cur;
    if (cur === to) clearInterval(timer);
  }, 60);
}

// ═══════════════════════════════════════════════
//  ANALYTICS CHART
// ═══════════════════════════════════════════════
let progressChartInstance = null;

function renderProgressChart() {
  const ctx = document.getElementById('progressChart')?.getContext('2d');
  if (!ctx) return;

  // Calculate last 7 days labels and counts
  const labels = [];
  const data = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  // Tally up dates
  Object.values(doneDates).forEach(isoDate => {
    const d = new Date(isoDate);
    const diffTime = today - d;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 6) {
      // Index 6 is today, 5 is yesterday, etc.
      const index = 6 - diffDays;
      data[index]++;
    }
  });

  if (progressChartInstance) {
    progressChartInstance.data.datasets[0].data = data;
    progressChartInstance.update();
  } else {
    // We need to wait for Chart.js to load, so if it's not available yet, just return
    if (typeof Chart === 'undefined') return;

    progressChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Chapters Completed',
          data: data,
          backgroundColor: 'rgba(245, 200, 66, 0.85)',
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(4, 7, 17, 0.9)',
            titleColor: '#f5c842',
            bodyColor: '#fff',
            cornerRadius: 8,
            padding: 10
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }
          },
          x: {
            ticks: { color: 'rgba(255,255,255,0.7)' },
            grid: { display: false, drawBorder: false }
          }
        }
      }
    });
  }
}

// ═══════════════════════════════════════════════
//  SUBJECT FILTER (nav tabs)
// ═══════════════════════════════════════════════
function filterSubject(filter) {
  // Update tabs
  document.querySelectorAll('.subject-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById(`tab-${filter}`);
  if (tabEl) tabEl.classList.add('active');

  // Show/hide subject cards
  document.querySelectorAll('.subject-card').forEach(card => {
    const subj = card.dataset.subject;
    if (filter === 'all' || filter === subj) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// ═══════════════════════════════════════════════
//  VIDEO PLAYER & LECTURE TIME TRACKING (RESUME FEATURE)
// ═══════════════════════════════════════════════
let ytPlayers = {};
let trackingIntervals = {};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function renderResumeBadges() {
  // Check all videos for saved timestamps
  const allVideoKeys = [
    'm4-1','m5-1','m6-1','m7-1','m8-1','m9-1','m10-1',
    'e7-1','e8-1','e9-1','e10-1','e11-1','e12-1','e13-1','e22-1','e25-1','e27-1','e28-1',
    'c2-1','c3-1','p2-1','p3-1','b3-1','b4-1','b4-2',
    'h2-1','h3-1','h4-1','h5-1','g3-1','g4-1','g5-1','cp3-1','cp5-1'
  ];

  allVideoKeys.forEach(key => {
    const savedTime = parseInt(localStorage.getItem(`shivansh_time_${key}`) || '0');
    updateResumeBadge(key, savedTime);
  });
}

function updateResumeBadge(videoKey, savedTime) {
  const thumb = document.getElementById(`thumb-${videoKey}`);
  if (!thumb) return;

  let badge = thumb.querySelector('.resume-badge');
  if (savedTime > 10) {
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'resume-badge';
      thumb.appendChild(badge);
    }
    badge.innerHTML = `⏱️ Resume at ${formatTime(savedTime)}`;
  } else if (badge) {
    badge.remove();
  }
}

function loadVideo(videoKey, videoId) {
  const thumb     = document.getElementById(`thumb-${videoKey}`);
  const container = document.getElementById(`iframe-${videoKey}`);
  const iframe    = document.getElementById(`yt-${videoKey}`);
  if (!thumb || !container || !iframe) return;

  const savedTime = parseInt(localStorage.getItem(`shivansh_time_${videoKey}`) || '0');
  const startParam = savedTime > 5 ? `&start=${savedTime}` : '';

  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1${startParam}`;
  thumb.style.display     = 'none';
  container.style.display = 'block';

  if (savedTime > 5) {
    showToast(`▶ Resuming lecture at ${formatTime(savedTime)}`);
  }

  // Start tracking playback time with YouTube iframe postMessage API
  startTrackingVideo(videoKey, iframe);
}

function startTrackingVideo(videoKey, iframe) {
  stopTrackingVideo(videoKey);

  // Poll video timestamp using YouTube postMessage API
  trackingIntervals[videoKey] = setInterval(() => {
    try {
      iframe.contentWindow.postMessage('{"event":"listening","id":1}', '*');
      iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
    } catch(e){}
  }, 2500);
}

function stopTrackingVideo(videoKey) {
  if (trackingIntervals[videoKey]) {
    clearInterval(trackingIntervals[videoKey]);
    delete trackingIntervals[videoKey];
  }
}

function closeVideo(videoKey) {
  stopTrackingVideo(videoKey);
  const thumb     = document.getElementById(`thumb-${videoKey}`);
  const container = document.getElementById(`iframe-${videoKey}`);
  const iframe    = document.getElementById(`yt-${videoKey}`);
  if (!thumb || !container || !iframe) return;

  iframe.src              = '';
  container.style.display = 'none';
  thumb.style.display     = 'block';

  const savedTime = parseInt(localStorage.getItem(`shivansh_time_${videoKey}`) || '0');
  if (savedTime > 10) {
    showToast(`💾 Saved playback progress: ${formatTime(savedTime)}`);
  }
}

function resetVideoTime(videoKey, event) {
  if (event) event.stopPropagation();
  localStorage.removeItem(`shivansh_time_${videoKey}`);
  updateResumeBadge(videoKey, 0);
  showToast(`🔄 Reset video timestamp`);
}

// Listen for YouTube postMessage response for timestamp updates
window.addEventListener('message', (event) => {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data && data.event === 'infoDelivery' && data.info && typeof data.info.currentTime === 'number') {
      const curTime = Math.floor(data.info.currentTime);
      if (curTime > 5) {
        // Update all active tracking keys
        Object.keys(trackingIntervals).forEach(key => {
          localStorage.setItem(`shivansh_time_${key}`, curTime);
          updateResumeBadge(key, curTime);
        });
      }
    }
  } catch(e){}
});

// Update renderDoneState to also call renderResumeBadges
const origRenderDoneState = renderDoneState;
renderDoneState = function() {
  origRenderDoneState();
  renderResumeBadges();
};


// ═══════════════════════════════════════════════
//  SCROLL
// ═══════════════════════════════════════════════
function scrollToContent() {
  document.getElementById('mainContent')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ═══════════════════════════════════════════════
//  GALLERY / LIGHTBOX / REEL (ALL 22 PHOTOS)
// ═══════════════════════════════════════════════
const galleryPhotos = SHIVANSH_PHOTOS;
let currentLbIdx = 0;
let currentGalleryFilter = 'all';

function initGallery() {
  renderPhotoReel();
  renderGalleryGrid();
}

function renderPhotoReel() {
  const reel = document.getElementById('photoReel');
  if (!reel) return;

  reel.innerHTML = galleryPhotos.map((src, i) => `
    <div class="reel-item" onclick="openGallery(${i})">
      <img src="${src}" alt="Shivansh moment ${i+1}" loading="lazy"/>
      <div class="reel-overlay">
        <span class="reel-num">#${i+1}</span>
      </div>
    </div>
  `).join('');
}

function renderGalleryGrid() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  let displayPhotos = [...galleryPhotos];

  if (currentGalleryFilter === 'featured') {
    // Pick 6 prominent photos
    displayPhotos = [0, 1, 3, 4, 8, 14].map(idx => galleryPhotos[idx]);
  } else if (currentGalleryFilter === 'random') {
    // Shuffle copy
    displayPhotos = [...galleryPhotos].sort(() => 0.5 - Math.random());
  }

  grid.innerHTML = displayPhotos.map((src, displayIdx) => {
    const originalIdx = galleryPhotos.indexOf(src);
    return `
      <div class="gallery-item" onclick="openGallery(${originalIdx})">
        <img src="${src}" alt="Shivansh photo ${originalIdx+1}" loading="lazy"/>
        <div class="gallery-overlay">
          <span class="gallery-num">#${originalIdx+1}</span>
          <span class="gallery-zoom-icon">🔍</span>
        </div>
      </div>
    `;
  }).join('');

  const countBadge = document.getElementById('photoCountBadge');
  if (countBadge) countBadge.textContent = displayPhotos.length;
}

function filterGallery(filter) {
  currentGalleryFilter = filter;
  document.querySelectorAll('.gfilter-btn').forEach(btn => btn.classList.remove('active'));
  event.target?.classList.add('active');
  renderGalleryGrid();
}

function openGallery(idx) {
  currentLbIdx = idx;
  document.getElementById('lbImg').src = galleryPhotos[idx];
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function lbPrev() {
  currentLbIdx = (currentLbIdx - 1 + galleryPhotos.length) % galleryPhotos.length;
  animateLbImg();
}

function lbNext() {
  currentLbIdx = (currentLbIdx + 1) % galleryPhotos.length;
  animateLbImg();
}

function animateLbImg() {
  const img = document.getElementById('lbImg');
  img.style.opacity   = '0';
  img.style.transform = 'scale(0.93)';
  setTimeout(() => {
    img.src             = galleryPhotos[currentLbIdx];
    img.style.transition = 'opacity 0.3s, transform 0.3s';
    img.style.opacity   = '1';
    img.style.transform = 'scale(1)';
  }, 150);
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb?.classList.contains('open')) return;
  if (e.key === 'ArrowLeft')  lbPrev();
  if (e.key === 'ArrowRight') lbNext();
  if (e.key === 'Escape')     closeLightbox();
});

// Swipe on lightbox
let lbTouchStart = 0;
document.getElementById('lightbox')?.addEventListener('touchstart', e => {
  lbTouchStart = e.touches[0].clientX;
}, { passive: true });
document.getElementById('lightbox')?.addEventListener('touchend', e => {
  const diff = lbTouchStart - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 40) diff > 0 ? lbNext() : lbPrev();
});

// ═══════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ═══════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════
const canvas = document.getElementById('confettiCanvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let animFrame = null;

function launchConfetti() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#f5c842','#22d3ee','#6366f1','#10b981','#f43f5e','#fb923c','#2dd4bf','#38bdf8'];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6  + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 8,
      opacity: 1,
    });
  }
  cancelAnimationFrame(animFrame);
  drawConfetti();
}

function drawConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.opacity > 0.05);
  particles.forEach(p => {
    p.x  += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.08;
    if (p.y > canvas.height * 0.75) p.opacity -= 0.025;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot * Math.PI / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
    ctx.restore();
  });
  if (particles.length) animFrame = requestAnimationFrame(drawConfetti);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ═══════════════════════════════════════════════
//  MOTIVATIONAL QUOTES & PORTRAIT SWAP
// ═══════════════════════════════════════════════
const quotes = [
  'Success is the sum of small efforts repeated day in and day out.',
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Study while others are sleeping." — William A. Ward',
  '"Education is the most powerful weapon you can use to change the world." — Nelson Mandela',
  '"Don\'t wish it were easier, wish you were better." — Jim Rohn',
  '"Believe you can and you\'re halfway there." — Theodore Roosevelt',
  'Every expert was once a beginner. Keep going, Shivansh! 💪',
  'Small progress is still progress. You\'ve got this! 🌟',
  'Hard work beats talent when talent doesn\'t work hard.',
  'History is a vision of the past to build a better future. 🏛️',
  'Geography is the subject which holds the key to our future. 🌍',
  'Logic is the foundation of computer science. 💻'
];
let lastQuoteIdx = -1;

function newQuote() {
  let idx;
  do { idx = Math.floor(Math.random() * quotes.length); } while (idx === lastQuoteIdx);
  lastQuoteIdx = idx;

  const quoteEl = document.getElementById('quoteText');
  const avatarEl = document.getElementById('quoteAvatarImg');

  if (quoteEl) {
    quoteEl.style.opacity   = '0';
    quoteEl.style.transform = 'translateY(6px)';
    setTimeout(() => {
      quoteEl.textContent = quotes[idx];
      quoteEl.style.transition = 'opacity 0.35s, transform 0.35s';
      quoteEl.style.opacity   = '1';
      quoteEl.style.transform = 'translateY(0)';
    }, 180);
  }

  if (avatarEl) {
    const randomPhotoIdx = Math.floor(Math.random() * SHIVANSH_PHOTOS.length);
    avatarEl.style.transform = 'scale(0.85)';
    avatarEl.style.opacity   = '0.4';
    setTimeout(() => {
      avatarEl.src = SHIVANSH_PHOTOS[randomPhotoIdx];
      avatarEl.style.transform = 'scale(1)';
      avatarEl.style.opacity   = '1';
    }, 180);
  }
}

// ═══════════════════════════════════════════════
//  GALAXY STARDUST PARTICLE ENGINE
// ═══════════════════════════════════════════════
const galaxyCanvas = document.getElementById('galaxyCanvas');
const gCtx = galaxyCanvas ? galaxyCanvas.getContext('2d') : null;
let galaxyStars = [];
const starColors = ['#ffffff', '#f5c842', '#a855f7', '#06b6d4', '#e0f2fe'];

function initGalaxyParticles() {
  if (!galaxyCanvas || !gCtx) return;
  
  galaxyCanvas.width = window.innerWidth;
  galaxyCanvas.height = window.innerHeight;
  
  galaxyStars = [];
  const count = Math.min(85, Math.floor((window.innerWidth * window.innerHeight) / 14000));
  
  for (let i = 0; i < count; i++) {
    galaxyStars.push({
      x: Math.random() * galaxyCanvas.width,
      y: Math.random() * galaxyCanvas.height,
      r: Math.random() * 1.6 + 0.4,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      angle: Math.random() * Math.PI * 2,
      speed: (Math.random() * 0.035 + 0.015) * (Math.random() > 0.5 ? 1 : -1),
      orbit: Math.random() * 100 + 40,
      ox: Math.random() * galaxyCanvas.width,
      oy: Math.random() * galaxyCanvas.height,
      alpha: Math.random() * 0.6 + 0.25,
      alphaDirection: Math.random() > 0.5 ? 0.004 : -0.004
    });
  }
  
  animateGalaxy();
}

function animateGalaxy() {
  if (!galaxyCanvas || !gCtx) return;
  
  gCtx.clearRect(0, 0, galaxyCanvas.width, galaxyCanvas.height);
  
  galaxyStars.forEach(s => {
    s.angle += s.speed * 0.03;
    s.x = s.ox + Math.cos(s.angle) * s.orbit;
    s.y = s.oy + Math.sin(s.angle) * s.orbit;
    
    s.alpha += s.alphaDirection;
    if (s.alpha > 0.8 || s.alpha < 0.25) s.alphaDirection *= -1;
    
    gCtx.save();
    gCtx.globalAlpha = s.alpha;
    gCtx.beginPath();
    gCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    gCtx.fillStyle = s.color;
    gCtx.shadowBlur = s.r * 5;
    gCtx.shadowColor = s.color;
    gCtx.fill();
    gCtx.restore();
  });
  
  requestAnimationFrame(animateGalaxy);
}

// ── Init ──────────────────────────────────────────────────
const origInitGallery = initGallery;
initGallery = function() {
  origInitGallery();
  initGalaxyParticles();
};

// ═══════════════════════════════════════════════
//  RESIZE
// ═══════════════════════════════════════════════
window.addEventListener('resize', () => {
  if (particles.length) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  if (galaxyCanvas) { galaxyCanvas.width = window.innerWidth; galaxyCanvas.height = window.innerHeight; }
});
