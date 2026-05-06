// ============================================================
//  WhiteBoard Studio — Engine v2
//  Features: Icons + Text + Multi-scene + Audio + WebM Export + Save/Load
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

const board = document.getElementById('board');
const drawHand = document.getElementById('draw-hand');
const canvasFrame = document.getElementById('canvas-frame');
const libGrid = document.getElementById('lib-grid');
const libSearch = document.getElementById('lib-search');
const scenesList = document.getElementById('scenes-list');
const track = document.getElementById('track');
const timecode = document.getElementById('timecode');
const bgAudio = document.getElementById('bg-audio');

const propDuration = document.getElementById('prop-duration');
const propEffect = document.getElementById('prop-effect');
const propColor = document.getElementById('prop-color');
const propStroke = document.getElementById('prop-stroke');

let scenes = [
  { id: 1, name: 'مشهد 1', items: [], duration: 3, effect: 'draw', color: '#222', stroke: 2.5, background: null, drawStyle: 'pen', camera: null }
];
let currentSceneId = 1;
let nextItemId = 1;
let nextSceneId = 2;
let isPlaying = false;
let playAbort = null;
let selectedIds = new Set();
let projectHandStyle = 'hand-light';

// =========== SELECTION HELPERS ===========
function isSelected(id) { return selectedIds.has(id); }
function selectOnly(id) { selectedIds.clear(); selectedIds.add(id); }
function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
}
function clearSelection() { selectedIds.clear(); }
function getSelectedItems() {
  if (!selectedIds.size) return [];
  return currentScene().items.filter(it => selectedIds.has(it.id));
}
function firstSelectedId() {
  return selectedIds.size ? selectedIds.values().next().value : null;
}

// =========== HAND STYLES ===========
// Each hand is positioned so the PEN/TOOL TIP is at the top-left corner of the viewBox.
// CSS offset (transform-origin & top/left) adjusts so the tip snaps to the drawing point.
const HAND_STYLES = {
  'hand-light': `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='240' viewBox='0 0 200 240'>
    <defs>
      <linearGradient id='sk1' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23fcdab8'/><stop offset='1' stop-color='%23d6a576'/>
      </linearGradient>
      <linearGradient id='pn1' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23444'/><stop offset='1' stop-color='%23111'/>
      </linearGradient>
    </defs>
    <line x1='10' y1='10' x2='110' y2='110' stroke='url(%23pn1)' stroke-width='9' stroke-linecap='round'/>
    <line x1='10' y1='10' x2='28' y2='28' stroke='%233b82f6' stroke-width='10' stroke-linecap='round'/>
    <circle cx='10' cy='10' r='3' fill='%23000'/>
    <path d='M 130 150 Q 165 195 200 235 L 200 240 L 170 240 Q 105 230 80 195 Q 65 165 85 145 Z' fill='url(%23sk1)' stroke='%237a4a1f' stroke-width='2'/>
    <path d='M 70 95 C 50 105 45 135 65 165 C 90 195 140 200 170 175 C 185 155 178 128 158 113 C 138 98 95 88 75 95 Z' fill='url(%23sk1)' stroke='%237a4a1f' stroke-width='2'/>
    <path d='M 78 96 C 60 80 70 65 92 72 C 102 80 95 96 85 100 Z' fill='url(%23sk1)' stroke='%237a4a1f' stroke-width='1.8'/>
    <path d='M 95 92 C 92 65 112 50 122 65 C 124 88 112 100 100 96 Z' fill='url(%23sk1)' stroke='%237a4a1f' stroke-width='1.8'/>
    <path d='M 118 100 C 116 80 128 65 138 72 C 144 88 138 105 130 108 Z' fill='url(%23sk1)' stroke='%237a4a1f' stroke-width='1.8'/>
    <path d='M 95 130 Q 130 134 160 128' fill='none' stroke='%23a8775d' stroke-width='1' opacity='0.5'/>
    <path d='M 110 175 Q 135 178 155 172' fill='none' stroke='%23a8775d' stroke-width='1.5' opacity='0.6'/>
    <ellipse cx='100' cy='62' rx='5' ry='3' fill='%23fff8f0' opacity='0.55'/>
    <ellipse cx='128' cy='72' rx='5' ry='3' fill='%23fff8f0' opacity='0.55'/>
  </svg>`,
  'hand-dark': `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='240' viewBox='0 0 200 240'>
    <defs>
      <linearGradient id='sk2' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23a47148'/><stop offset='1' stop-color='%236b4226'/>
      </linearGradient>
      <linearGradient id='pn2' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23444'/><stop offset='1' stop-color='%23111'/>
      </linearGradient>
    </defs>
    <line x1='10' y1='10' x2='110' y2='110' stroke='url(%23pn2)' stroke-width='9' stroke-linecap='round'/>
    <line x1='10' y1='10' x2='28' y2='28' stroke='%23ef4444' stroke-width='10' stroke-linecap='round'/>
    <circle cx='10' cy='10' r='3' fill='%23000'/>
    <path d='M 130 150 Q 165 195 200 235 L 200 240 L 170 240 Q 105 230 80 195 Q 65 165 85 145 Z' fill='url(%23sk2)' stroke='%23362012' stroke-width='2'/>
    <path d='M 70 95 C 50 105 45 135 65 165 C 90 195 140 200 170 175 C 185 155 178 128 158 113 C 138 98 95 88 75 95 Z' fill='url(%23sk2)' stroke='%23362012' stroke-width='2'/>
    <path d='M 78 96 C 60 80 70 65 92 72 C 102 80 95 96 85 100 Z' fill='url(%23sk2)' stroke='%23362012' stroke-width='1.8'/>
    <path d='M 95 92 C 92 65 112 50 122 65 C 124 88 112 100 100 96 Z' fill='url(%23sk2)' stroke='%23362012' stroke-width='1.8'/>
    <path d='M 118 100 C 116 80 128 65 138 72 C 144 88 138 105 130 108 Z' fill='url(%23sk2)' stroke='%23362012' stroke-width='1.8'/>
    <path d='M 110 175 Q 135 178 155 172' fill='none' stroke='%23ffd9b3' stroke-width='1.2' opacity='0.35'/>
    <ellipse cx='100' cy='62' rx='5' ry='3' fill='%23ffe6c8' opacity='0.45'/>
    <ellipse cx='128' cy='72' rx='5' ry='3' fill='%23ffe6c8' opacity='0.45'/>
  </svg>`,
  'pencil': `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='260' viewBox='0 0 200 260'>
    <defs>
      <linearGradient id='pncl' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23fde68a'/><stop offset='1' stop-color='%23ca8a04'/>
      </linearGradient>
    </defs>
    <polygon points='10,10 25,5 35,15 25,28 12,22' fill='%23231f20' stroke='%23000' stroke-width='1.2'/>
    <polygon points='28,12 38,22 95,80 110,90 105,95 90,110 30,52 22,38' fill='%23f5d99b' stroke='%23a16207' stroke-width='1.5'/>
    <line x1='30' y1='15' x2='95' y2='80' stroke='%23a16207' stroke-width='1' opacity='0.5'/>
    <rect x='90' y='75' width='90' height='30' rx='4' transform='rotate(45 90 75)' fill='url(%23pncl)' stroke='%23854d0e' stroke-width='2'/>
    <rect x='150' y='115' width='30' height='25' rx='4' transform='rotate(45 150 115)' fill='%23dc2626' stroke='%23991b1b' stroke-width='2'/>
    <rect x='170' y='135' width='12' height='30' rx='2' transform='rotate(45 170 135)' fill='%23e5e7eb' stroke='%236b7280' stroke-width='1.5'/>
    <rect x='178' y='160' width='14' height='14' rx='2' transform='rotate(45 178 160)' fill='%23fda4af' stroke='%23881337' stroke-width='1.5'/>
  </svg>`,
  'marker': `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='240' viewBox='0 0 180 240'>
    <defs>
      <linearGradient id='mk' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%2360a5fa'/><stop offset='1' stop-color='%231e40af'/>
      </linearGradient>
    </defs>
    <polygon points='10,10 28,3 40,15 30,30 14,24' fill='%23111' stroke='%23000' stroke-width='1.5'/>
    <rect x='32' y='12' width='30' height='14' rx='3' transform='rotate(45 32 12)' fill='%231e3a8a' stroke='%23172554' stroke-width='1.5'/>
    <rect x='52' y='32' width='130' height='42' rx='8' transform='rotate(45 52 32)' fill='url(%23mk)' stroke='%231e3a8a' stroke-width='2.5'/>
    <line x1='80' y1='35' x2='150' y2='105' stroke='%23bfdbfe' stroke-width='3' opacity='0.6'/>
  </svg>`,
  'brush': `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='260' viewBox='0 0 200 260'>
    <defs>
      <linearGradient id='br' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23a78bfa'/><stop offset='1' stop-color='%235b21b6'/>
      </linearGradient>
    </defs>
    <path d='M 10 10 Q 5 20 8 30 L 38 60 Q 48 50 52 38 Q 50 28 30 12 Q 20 6 10 10 Z' fill='%23a16207' stroke='%23713f12' stroke-width='1.5'/>
    <path d='M 12 8 Q 18 18 32 30 M 16 4 Q 22 14 36 26 M 8 14 Q 14 22 28 34' stroke='%23713f12' stroke-width='1' opacity='0.6' fill='none'/>
    <rect x='40' y='30' width='30' height='14' rx='3' transform='rotate(45 40 30)' fill='%23737373' stroke='%23404040' stroke-width='1.5'/>
    <rect x='60' y='50' width='110' height='38' rx='5' transform='rotate(45 60 50)' fill='url(%23br)' stroke='%234c1d95' stroke-width='2'/>
    <rect x='150' y='130' width='30' height='14' rx='3' transform='rotate(45 150 130)' fill='%237c3aed' stroke='%234c1d95' stroke-width='1.5'/>
  </svg>`
};

// Library of user-uploaded custom hands. Each: { id, name, src, tipX, tipY }
let customHands = (() => {
  try {
    const raw = localStorage.getItem('wb_custom_hands');
    if (raw) return JSON.parse(raw);
    // Migrate from the old single-hand format
    const oldSrc = localStorage.getItem('wb_custom_hand');
    if (oldSrc) {
      let oldTip = { x: 0.05, y: 0.05 };
      try { oldTip = JSON.parse(localStorage.getItem('wb_custom_hand_tip')) || oldTip; } catch {}
      const migrated = [{
        id: 'cust_legacy', name: 'يد مخصصة',
        src: oldSrc, tipX: oldTip.x, tipY: oldTip.y
      }];
      localStorage.setItem('wb_custom_hands', JSON.stringify(migrated));
      localStorage.removeItem('wb_custom_hand');
      localStorage.removeItem('wb_custom_hand_tip');
      return migrated;
    }
    return [];
  } catch { return []; }
})();

function saveCustomHands() { localStorage.setItem('wb_custom_hands', JSON.stringify(customHands)); }
function findCustomHand(id) { return customHands.find(h => h.id === id); }

// Tip fraction (0..1) for the current hand — used by positioning code
let currentHandTipFrac = { x: 0.05, y: 0.05 };

function setHandStyle(id) {
  const custom = findCustomHand(id);
  if (custom) {
    projectHandStyle = id;
    drawHand.src = custom.src;
    currentHandTipFrac = { x: custom.tipX, y: custom.tipY };
    return;
  }
  if (!HAND_STYLES[id]) id = 'hand-light';
  projectHandStyle = id;
  drawHand.src = 'data:image/svg+xml;utf8,' + HAND_STYLES[id];
  currentHandTipFrac = { x: 0.05, y: 0.05 };
}

// =========== UNDO / REDO ===========
const HISTORY_LIMIT = 80;
let historyStack = [];
let redoStack = [];
let pendingSnap = null; // captured before drag/slider; committed once mutation actually happens

function snapshotState() {
  return JSON.stringify({ scenes, currentSceneId, selectedIds: [...selectedIds], nextItemId, nextSceneId });
}
function restoreState(snap) {
  const s = JSON.parse(snap);
  scenes = s.scenes;
  currentSceneId = s.currentSceneId;
  selectedIds = new Set(s.selectedIds || (s.selectedItemId ? [s.selectedItemId] : []));
  nextItemId = s.nextItemId;
  nextSceneId = s.nextSceneId;
  renderScenes(); renderCanvas(); syncProps(); syncItemControls();
  updateUndoRedoButtons();
}
function pushHistory() {
  historyStack.push(snapshotState());
  if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
  redoStack = [];
  pendingSnap = null;
  updateUndoRedoButtons();
  scheduleAutoSave();
}
// Capture state before an operation that may or may not mutate (drags, sliders).
function beginAction() { pendingSnap = snapshotState(); }
// Commit the captured state to the undo stack (call once the mutation is observed).
function commitPending() {
  if (!pendingSnap) return;
  historyStack.push(pendingSnap);
  if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
  redoStack = [];
  pendingSnap = null;
  updateUndoRedoButtons();
  scheduleAutoSave();
}
function undo() {
  if (!historyStack.length) return;
  redoStack.push(snapshotState());
  restoreState(historyStack.pop());
}
function redo() {
  if (!redoStack.length) return;
  historyStack.push(snapshotState());
  restoreState(redoStack.pop());
}
function updateUndoRedoButtons() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if (u) u.disabled = !historyStack.length;
  if (r) r.disabled = !redoStack.length;
}
function resetHistory() {
  historyStack = []; redoStack = []; pendingSnap = null;
  updateUndoRedoButtons();
}

// =========== AUTO-SAVE ===========
const AUTO_SAVE_DELAY = 1500;
let autoSaveEnabled = localStorage.getItem('wb_autosave') !== 'off';
let autoSaveTimer = null;
let autoSaveInFlight = false;
let autoSavePending = false;
let suppressAutoSave = false; // set during loadProject to avoid re-saving the just-loaded data

function scheduleAutoSave() {
  if (suppressAutoSave) return;
  if (!autoSaveEnabled) return;
  if (isPlaying) return;
  if (!window.WB_API || !WB_API.Auth.isLoggedIn()) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => doSave(true), AUTO_SAVE_DELAY);
}

async function doSave(isAuto) {
  if (autoSaveInFlight) {
    autoSavePending = true;
    return;
  }
  autoSaveInFlight = true;
  setSaveStatus('saving');
  try {
    const name = document.getElementById('project-name').value.trim() || 'مشروع جديد';
    const data = {
      scenes,
      nextItemId,
      nextSceneId,
      audioUrl: bgAudio.dataset.serverUrl || null,
      handStyle: projectHandStyle
    };
    if (currentProjectId) {
      await WB_API.Projects.update(currentProjectId, { name, data });
    } else {
      const r = await WB_API.Projects.create(name, data);
      currentProjectId = r.id;
    }
    setSaveStatus('saved');
  } catch (e) {
    console.warn('Save failed:', e);
    setSaveStatus('error', e.message || 'خطأ');
    if (!isAuto) alert('فشل الحفظ: ' + (e.message || 'خطأ'));
  } finally {
    autoSaveInFlight = false;
    if (autoSavePending) {
      autoSavePending = false;
      scheduleAutoSave();
    }
  }
}

let saveResetTimer = null;
function setSaveStatus(state, msg) {
  const btn = document.getElementById('btn-save');
  if (!btn) return;
  clearTimeout(saveResetTimer);
  btn.classList.remove('saving', 'saved', 'error');
  if (state === 'saving') {
    btn.innerHTML = '<span class="save-spin">⟳</span> جارى الحفظ';
    btn.classList.add('saving');
    btn.title = 'جارى الحفظ التلقائى';
  } else if (state === 'saved') {
    btn.innerHTML = '✓ تم الحفظ';
    btn.classList.add('saved');
    btn.title = 'تم الحفظ تلقائياً';
    saveResetTimer = setTimeout(() => {
      btn.classList.remove('saved');
      btn.innerHTML = '💾 حفظ';
      btn.title = autoSaveEnabled ? 'حفظ يدوى (Ctrl+S) — الحفظ التلقائى مفعّل' : 'حفظ يدوى (Ctrl+S)';
    }, 2200);
  } else if (state === 'error') {
    btn.innerHTML = '⚠ فشل الحفظ';
    btn.classList.add('error');
    btn.title = msg || 'فشل الحفظ — هتُعاد المحاولة مع التغيير القادم';
  } else {
    btn.innerHTML = '💾 حفظ';
    btn.title = autoSaveEnabled ? 'حفظ يدوى (Ctrl+S) — الحفظ التلقائى مفعّل' : 'حفظ يدوى (Ctrl+S)';
  }
}

function toggleAutoSave() {
  autoSaveEnabled = !autoSaveEnabled;
  localStorage.setItem('wb_autosave', autoSaveEnabled ? 'on' : 'off');
  setSaveStatus('idle');
  flashStatus(autoSaveEnabled ? '✓ الحفظ التلقائى مفعّل' : '⏸ الحفظ التلقائى متوقف');
}

// =========== VIEWPORT (pan + zoom) ===========
let viewX = 0, viewY = 0, viewW = 1280, viewH = 720;
let spaceHeld = false;
const zoomInfoEl = document.getElementById('zoom-info');

function updateViewBox() {
  board.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);
  if (zoomInfoEl) zoomInfoEl.textContent = Math.round(1280 / viewW * 100) + '%';
  drawSelectionHandles();
}

function resetView() { viewX = 0; viewY = 0; viewW = 1280; viewH = 720; updateViewBox(); }

// Spacebar tracking — toggles pan-mode cursor
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  if (!spaceHeld) {
    spaceHeld = true;
    document.body.classList.add('pan-mode');
  }
  e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spaceHeld = false;
    document.body.classList.remove('pan-mode');
  }
});
window.addEventListener('blur', () => { spaceHeld = false; document.body.classList.remove('pan-mode'); });

// Capturing pointerdown — intercepts before items/handles when pan is active
board.addEventListener('pointerdown', (e) => {
  const middleMouse = e.button === 1;
  if (!spaceHeld && !middleMouse) return;
  if (isPlaying) return;
  e.stopPropagation();
  e.preventDefault();
  document.body.classList.add('panning');
  const startX = e.clientX, startY = e.clientY;
  const startVX = viewX, startVY = viewY;
  const br = board.getBoundingClientRect();
  const sx = viewW / br.width;
  const sy = viewH / br.height;
  function onMove(ev) {
    viewX = startVX - (ev.clientX - startX) * sx;
    viewY = startVY - (ev.clientY - startY) * sy;
    updateViewBox();
  }
  function onUp() {
    document.body.classList.remove('panning');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}, true);

// Ctrl+scroll = zoom around cursor; Shift+scroll = pan
canvasFrame.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.85 : 1.18;
    const newW = Math.max(200, Math.min(5000, viewW * factor));
    const newH = newW * (720 / 1280);
    const r = board.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width;
    const my = (e.clientY - r.top) / r.height;
    const focalX = viewX + mx * viewW;
    const focalY = viewY + my * viewH;
    viewX = focalX - mx * newW;
    viewY = focalY - my * newH;
    viewW = newW; viewH = newH;
    updateViewBox();
  }
}, { passive: false });

// Double-click on zoom indicator → reset view
if (zoomInfoEl) {
  zoomInfoEl.style.cursor = 'pointer';
  zoomInfoEl.title = 'انقر مرتين للعودة 100%';
  zoomInfoEl.addEventListener('dblclick', resetView);
  zoomInfoEl.addEventListener('click', resetView);
}

// =========== TRANSFORM BUILDERS ===========
function getIconTransform(it) {
  const sX = it.scale * (it.flipX ? -1 : 1);
  const sY = it.scale * (it.flipY ? -1 : 1);
  return `translate(${it.x} ${it.y}) scale(${sX} ${sY}) rotate(${it.rotation || 0}, 640, 420)`;
}
function getTextTransform(it) {
  const rot = it.rotation || 0;
  if (!rot && !it.flipX && !it.flipY) return '';
  const sX = it.flipX ? -1 : 1;
  const sY = it.flipY ? -1 : 1;
  const cx = it.x, cy = it.y - it.fontSize * 0.3;
  return `rotate(${rot} ${cx} ${cy}) translate(${cx} ${cy}) scale(${sX} ${sY}) translate(${-cx} ${-cy})`;
}
function getChartTransform(it) {
  const rot = it.rotation || 0;
  const sX = it.flipX ? -1 : 1;
  const sY = it.flipY ? -1 : 1;
  if (!rot && sX === 1 && sY === 1) return `translate(${it.x} ${it.y})`;
  const cx = (it.width || 800) / 2;
  const cy = (it.height || 440) / 2;
  // Position to (x,y), then rotate/scale around the chart's center
  return `translate(${it.x + cx} ${it.y + cy}) rotate(${rot}) scale(${sX} ${sY}) translate(${-cx} ${-cy})`;
}
function getImageTransform(it) {
  const rot = it.rotation || 0;
  const sX = it.flipX ? -1 : 1;
  const sY = it.flipY ? -1 : 1;
  if (!rot && sX === 1 && sY === 1) return '';
  const cx = it.x + it.width / 2, cy = it.y + it.height / 2;
  return `rotate(${rot} ${cx} ${cy}) translate(${cx} ${cy}) scale(${sX} ${sY}) translate(${-cx} ${-cy})`;
}

// =========== LIBRARY UI ===========
const libCats = document.getElementById('lib-cats');
let activeCat = null; // null = show categories only

function renderLibraryView() {
  const searchQuery = libSearch.value.trim();
  // Show icons either when a category is selected OR when user is searching
  if (activeCat || searchQuery) {
    libCats.style.display = 'none';
    libGrid.style.display = 'grid';
    renderIconsView();
  } else {
    libCats.style.display = 'grid';
    libGrid.style.display = 'none';
    renderCategoriesView();
  }
}

function renderCategoriesView() {
  libCats.innerHTML = '';
  libCats.classList.add('cats-grid');
  (window.ICON_CATEGORIES || []).filter(c => c.id !== 'all').forEach(c => {
    const count = ICON_LIBRARY.filter(ic => ic.cat === c.id).length;
    const btn = document.createElement('button');
    btn.className = 'cat-card';
    btn.innerHTML = `
      <span class="cat-card-icon">${c.icon}</span>
      <span class="cat-card-name">${c.name}</span>
      <span class="cat-card-count">${count}</span>`;
    btn.onclick = () => { activeCat = c.id; renderLibraryView(); };
    libCats.appendChild(btn);
  });
}

function renderIconsView() {
  libGrid.innerHTML = '';
  // Back button
  const back = document.createElement('div');
  back.className = 'lib-back';
  const cat = (window.ICON_CATEGORIES || []).find(c => c.id === activeCat);
  back.innerHTML = `<button class="back-btn">← الفئات</button><span class="cat-title">${cat ? cat.icon + ' ' + cat.name : 'كل النتائج'}</span>`;
  back.querySelector('.back-btn').onclick = () => {
    activeCat = null; libSearch.value = ''; renderLibraryView();
  };
  libGrid.appendChild(back);

  const f = libSearch.value.trim().toLowerCase();
  const matches = ICON_LIBRARY
    .filter(ic => !activeCat || ic.cat === activeCat)
    .filter(ic => {
      if (!f) return true;
      const kw = (ic.kw || ic.keywords || '').toLowerCase();
      return kw.includes(f) || (ic.name || '').includes(f);
    });

  matches.forEach(ic => {
    const div = document.createElement('div');
    div.className = 'lib-item';
    div.title = ic.name;
    div.innerHTML = wrapIcon(ic.svg);
    div.onclick = () => addIconToScene(ic.svg);
    libGrid.appendChild(div);
  });
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--muted);font-size:12px;padding:20px;';
    empty.textContent = 'لا توجد نتائج';
    libGrid.appendChild(empty);
  }
}

// Backward-compat aliases used elsewhere
function renderCategories() { renderLibraryView(); }
function renderLibrary() { renderLibraryView(); }

libSearch.oninput = () => renderLibraryView();

// =========== SCENE STATE ===========
function currentScene() { return scenes.find(s => s.id === currentSceneId); }

function addIconToScene(innerSvg) {
  pushHistory();
  const sc = currentScene();
  const newItem = {
    id: nextItemId++, type: 'icon', svg: innerSvg,
    x: 200 + Math.random() * 400, y: 150 + Math.random() * 300,
    scale: 0.6, rotation: 0, flipX: false, flipY: false,
    color: sc.color, stroke: sc.stroke,
    drawStyle: sc.drawStyle || 'pen'
  };
  sc.items.push(newItem);
  selectOnly(newItem.id);
  renderCanvas(); renderScenes(); syncItemControls();
}

async function addImageFromFile(file) {
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  pushHistory();
  const sc = currentScene();
  const maxW = 500;
  const w = Math.min(maxW, img.naturalWidth);
  const h = w * img.naturalHeight / img.naturalWidth;
  const newItem = {
    id: nextItemId++, type: 'image', src: dataUrl,
    x: 200 + Math.random() * 300, y: 150 + Math.random() * 200,
    width: w, height: h,
    rotation: 0, flipX: false, flipY: false
  };
  sc.items.push(newItem);
  selectOnly(newItem.id);
  renderCanvas(); renderScenes(); syncItemControls();
}

function addTextToScene(text, isRTL) {
  pushHistory();
  const sc = currentScene();
  const newItem = {
    id: nextItemId++, type: 'text', text,
    x: 200, y: 360, fontSize: 80, fontFamily: 'Cairo',
    bold: true, italic: false, underline: false,
    align: 'start', lineHeight: 1.2,
    rotation: 0, flipX: false, flipY: false,
    color: sc.color, isRTL: isRTL ?? /[؀-ۿ]/.test(text)
  };
  sc.items.push(newItem);
  selectOnly(newItem.id);
  renderCanvas(); renderScenes(); syncItemControls();
}

function addCounterToScene() {
  pushHistory();
  const sc = currentScene();
  const newItem = {
    id: nextItemId++, type: 'counter',
    x: 400, y: 380,
    from: 0, to: 100,
    decimals: 0, prefix: '', suffix: '',
    separator: true,
    fontSize: 120, fontFamily: 'Cairo',
    bold: true, italic: false,
    rotation: 0, flipX: false, flipY: false,
    color: sc.color, align: 'middle'
  };
  sc.items.push(newItem);
  selectOnly(newItem.id);
  renderCanvas(); renderScenes(); syncItemControls();
}

function addChartToScene() {
  pushHistory();
  const sc = currentScene();
  const newItem = {
    id: nextItemId++, type: 'chart',
    chartType: 'bar',
    data: [
      { label: 'يناير',  value: 30 },
      { label: 'فبراير', value: 60 },
      { label: 'مارس',   value: 45 },
      { label: 'أبريل',  value: 90 }
    ],
    x: 240, y: 140,
    width: 800, height: 440,
    rotation: 0, flipX: false, flipY: false,
    color: sc.color, stroke: sc.stroke,
    drawStyle: sc.drawStyle || 'pen'
  };
  sc.items.push(newItem);
  selectOnly(newItem.id);
  renderCanvas(); renderScenes(); syncItemControls();
}

function formatCounter(it, value) {
  const decimals = Math.max(0, Math.min(6, it.decimals || 0));
  let s = value.toFixed(decimals);
  if (it.separator) {
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
  }
  return (it.prefix || '') + s + (it.suffix || '');
}

function duplicateItem(id) {
  const sc = currentScene();
  const it = sc.items.find(x => x.id === id);
  if (!it) return;
  pushHistory();
  const clone = JSON.parse(JSON.stringify(it));
  clone.id = nextItemId++;
  clone.x = (clone.x || 0) + 30;
  clone.y = (clone.y || 0) + 30;
  sc.items.push(clone);
  selectOnly(clone.id);
  renderCanvas(); renderScenes(); syncItemControls();
}

// =========== STATIC RENDER ===========
function renderCanvas() {
  const sc = currentScene();
  board.innerHTML = '';
  renderBackground(sc);
  sc.items.forEach(it => {
    if (it.type === 'text') renderTextItem(it);
    else if (it.type === 'counter') renderCounterItem(it);
    else if (it.type === 'chart') renderChartItem(it);
    else if (it.type === 'image') renderImageItem(it);
    else renderIconItem(it);
  });
  drawSelectionHandles();
  renderLayersPanel();
}

// =========== LAYERS PANEL ===========
function layerIconFor(it) {
  if (it.type === 'text') return '📝';
  if (it.type === 'counter') return '🔢';
  if (it.type === 'chart') {
    if (it.chartType === 'pie') return '🥧';
    if (it.chartType === 'line') return '📈';
    return '📊';
  }
  if (it.type === 'image') return '🖼';
  if (it.type === 'icon') return '🎨';
  return '◆';
}
function layerLabelFor(it) {
  if (it.type === 'text') return (it.text || '').split('\n')[0].slice(0, 30) || 'نص فارغ';
  if (it.type === 'counter') return formatCounter(it, it.to);
  if (it.type === 'chart') {
    const t = it.chartType === 'pie' ? 'دائرى' : (it.chartType === 'line' ? 'خطى' : 'أعمدة');
    return `رسم ${t} (${(it.data || []).length} قيم)`;
  }
  if (it.type === 'image') return 'صورة';
  if (it.type === 'icon') return 'أيقونة';
  return '—';
}

function renderLayersPanel() {
  const list = document.getElementById('layers-list');
  const cnt = document.getElementById('layers-count');
  if (!list) return;
  const sc = currentScene();
  if (cnt) cnt.textContent = sc.items.length;
  list.innerHTML = '';
  if (!sc.items.length) {
    list.innerHTML = '<div class="layers-empty">المشهد فاضى — ضيفى عناصر من المكتبة</div>';
    return;
  }

  sc.items.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = 'layer-row' + (isSelected(it.id) ? ' active' : '');
    row.dataset.id = it.id;
    row.draggable = true;
    row.title = `النوع: ${it.type} — انقر للاختيار، اسحب لإعادة الترتيب`;
    row.innerHTML = `
      <span class="layer-handle">⋮⋮</span>
      <span class="layer-num">${idx + 1}</span>
      <span class="layer-icon">${layerIconFor(it)}</span>
      <span class="layer-label">${escapeHtml(layerLabelFor(it))}</span>
      <button class="layer-del" title="حذف العنصر">✕</button>
    `;

    row.onclick = (e) => {
      if (e.target.closest('.layer-del')) {
        e.stopPropagation();
        deleteItem(it.id);
        return;
      }
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (additive) toggleSelect(it.id);
      else selectOnly(it.id);
      syncItemControls();
      drawSelectionHandles();
      renderLayersPanel();
    };

    // Drag-and-drop reordering
    row.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', String(it.id));
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
    };
    row.ondragend = () => {
      row.classList.remove('dragging');
      list.querySelectorAll('.layer-row').forEach(r =>
        r.classList.remove('drag-over-top', 'drag-over-bottom'));
    };
    row.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const above = (e.clientY - rect.top) < rect.height / 2;
      row.classList.toggle('drag-over-top', above);
      row.classList.toggle('drag-over-bottom', !above);
    };
    row.ondragleave = () => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    };
    row.ondrop = (e) => {
      e.preventDefault();
      row.classList.remove('drag-over-top', 'drag-over-bottom');
      const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
      if (!draggedId || draggedId === it.id) return;
      const rect = row.getBoundingClientRect();
      const above = (e.clientY - rect.top) < rect.height / 2;
      reorderItem(draggedId, it.id, above ? 'before' : 'after');
    };

    list.appendChild(row);
  });
}

function reorderItem(fromId, toId, position) {
  const sc = currentScene();
  const fromIdx = sc.items.findIndex(it => it.id === fromId);
  let toIdx = sc.items.findIndex(it => it.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
  pushHistory();
  const [moved] = sc.items.splice(fromIdx, 1);
  // Recompute toIdx after removal
  toIdx = sc.items.findIndex(it => it.id === toId);
  const insertAt = position === 'after' ? toIdx + 1 : toIdx;
  sc.items.splice(insertAt, 0, moved);
  renderCanvas();
  renderScenes(); // updates the timeline item-count display
}

function buildTextElement(it, content) {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', it.x);
  t.setAttribute('y', it.y);
  t.setAttribute('font-size', it.fontSize);
  t.setAttribute('font-family', `'${it.fontFamily || 'Cairo'}', sans-serif`);
  t.setAttribute('fill', it.color);
  t.setAttribute('font-weight', it.bold !== false ? '700' : '400');
  if (it.italic) t.setAttribute('font-style', 'italic');
  if (it.underline) t.setAttribute('text-decoration', 'underline');
  if (it.align) t.setAttribute('text-anchor', it.align);
  if (it.isRTL) t.setAttribute('direction', 'rtl');

  const lines = String(content ?? '').split('\n');
  const lh = it.lineHeight || 1.2;
  if (lines.length <= 1) {
    t.textContent = lines[0] || '';
  } else {
    lines.forEach((line, i) => {
      const ts = document.createElementNS(SVG_NS, 'tspan');
      ts.setAttribute('x', it.x);
      if (i === 0) ts.setAttribute('dy', '0');
      else ts.setAttribute('dy', (lh * it.fontSize) + '');
      ts.textContent = line;
      t.appendChild(ts);
    });
  }
  return t;
}

function renderBackground(sc) {
  const bg = sc && sc.background;
  if (!bg || bg.type === 'none' || !bg.type) return;
  // Solid base color (always, when bg is set)
  const base = document.createElementNS(SVG_NS, 'rect');
  base.setAttribute('x', 0); base.setAttribute('y', 0);
  base.setAttribute('width', 1280); base.setAttribute('height', 720);
  base.setAttribute('fill', bg.color || '#ffffff');
  base.setAttribute('data-bg', '1');
  base.style.pointerEvents = 'none';
  board.appendChild(base);

  if (bg.type === 'solid') return;

  if (bg.type === 'image' && bg.src) {
    const img = document.createElementNS(SVG_NS, 'image');
    img.setAttribute('x', 0); img.setAttribute('y', 0);
    img.setAttribute('width', 1280); img.setAttribute('height', 720);
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', bg.src);
    img.setAttribute('href', bg.src);
    img.setAttribute('data-bg', '1');
    img.style.pointerEvents = 'none';
    board.appendChild(img);
    return;
  }

  // Pattern (grid / lines / dots / graph)
  const lineColor = bg.lineColor || '#cfd8e6';
  const patId = 'wb-bg-pat-' + (bg.type);
  let patW = 40, patH = 40, inner = '';
  if (bg.type === 'grid') {
    patW = 40; patH = 40;
    inner = `<path d="M 40 0 L 0 0 L 0 40" fill="none" stroke="${lineColor}" stroke-width="1"/>`;
  } else if (bg.type === 'lines') {
    patW = 40; patH = 40;
    inner = `<path d="M 0 39.5 L 40 39.5" fill="none" stroke="${lineColor}" stroke-width="1"/>`;
  } else if (bg.type === 'dots') {
    patW = 30; patH = 30;
    inner = `<circle cx="2" cy="2" r="1.6" fill="${lineColor}"/>`;
  } else if (bg.type === 'graph') {
    patW = 100; patH = 100;
    inner = `
      <path d="M 20 0 L 20 100 M 40 0 L 40 100 M 60 0 L 60 100 M 80 0 L 80 100" stroke="${lineColor}" stroke-width="0.6" opacity="0.55"/>
      <path d="M 0 20 L 100 20 M 0 40 L 100 40 M 0 60 L 100 60 M 0 80 L 100 80" stroke="${lineColor}" stroke-width="0.6" opacity="0.55"/>
      <path d="M 100 0 L 0 0 L 0 100" stroke="${lineColor}" stroke-width="1.4" fill="none"/>`;
  } else { return; }

  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `<pattern id="${patId}" patternUnits="userSpaceOnUse" width="${patW}" height="${patH}">${inner}</pattern>`;
  board.appendChild(defs);

  const overlay = document.createElementNS(SVG_NS, 'rect');
  overlay.setAttribute('x', 0); overlay.setAttribute('y', 0);
  overlay.setAttribute('width', 1280); overlay.setAttribute('height', 720);
  overlay.setAttribute('fill', `url(#${patId})`);
  overlay.setAttribute('data-bg', '1');
  overlay.style.pointerEvents = 'none';
  board.appendChild(overlay);
}

function renderImageItem(it) {
  const img = document.createElementNS(SVG_NS, 'image');
  img.setAttribute('x', it.x); img.setAttribute('y', it.y);
  img.setAttribute('width', it.width); img.setAttribute('height', it.height);
  img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', it.src);
  img.setAttribute('href', it.src);
  img.setAttribute('preserveAspectRatio', 'none');
  const tr = getImageTransform(it);
  if (tr) img.setAttribute('transform', tr);
  img.dataset.id = it.id;
  enableDrag(img, it);
  board.appendChild(img);
}

function renderIconItem(it) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.dataset.id = it.id;
  g.setAttribute('transform', getIconTransform(it));
  g.innerHTML = it.svg;
  applyStrokeStyle(g, it);
  enableDrag(g, it);
  board.appendChild(g);
}

function renderTextItem(it) {
  const t = buildTextElement(it, it.text);
  const tr = getTextTransform(it);
  if (tr) t.setAttribute('transform', tr);
  t.dataset.id = it.id;
  enableDrag(t, it);
  board.appendChild(t);
}

function renderCounterItem(it) {
  const t = buildTextElement(it, formatCounter(it, it.to));
  const tr = getTextTransform(it);
  if (tr) t.setAttribute('transform', tr);
  t.dataset.id = it.id;
  enableDrag(t, it);
  board.appendChild(t);
}

// ===== Chart geometry =====
function chartLayout(it) {
  const padL = 60, padB = 50, padT = 20, padR = 20;
  return {
    plotX: padL, plotY: padT,
    plotW: it.width - padL - padR,
    plotH: it.height - padT - padB,
    fullW: it.width, fullH: it.height
  };
}

function buildChartGroup(it, options = {}) {
  // Returns an SVG <g> with the static chart at item position (no animation).
  // options.partial: 0..1 — render only the first portion of the data (for animation)
  const partial = options.partial != null ? options.partial : 1;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', getChartTransform(it));
  const L = chartLayout(it);
  const stroke = (it.stroke || 2.5) * 4;
  const opacity = it.drawStyle === 'pencil' ? 0.78 : (it.drawStyle === 'brush' ? 0.85 : 1);
  const widthMul = it.drawStyle === 'pencil' ? 0.65 : (it.drawStyle === 'marker' ? 1.6 : (it.drawStyle === 'brush' ? 1.9 : 1));
  const linecap = it.drawStyle === 'marker' ? 'square' : 'round';
  const sw = stroke * widthMul;
  const baseAttrs = `fill="none" stroke="${it.color}" stroke-width="${sw}" stroke-linecap="${linecap}" stroke-linejoin="round"${opacity !== 1 ? ` stroke-opacity="${opacity}"` : ''}`;
  const labelFill = it.color;

  if (it.chartType === 'pie') {
    const total = it.data.reduce((a, d) => a + Math.max(0, d.value), 0) || 1;
    const cx = L.fullW / 2;
    const cy = L.fullH / 2;
    const r = Math.min(L.fullW, L.fullH) * 0.4;
    let angle = -Math.PI / 2; // start at top
    let svgInner = '';
    let cumulative = 0;
    it.data.forEach((d, i) => {
      const slicePart = total === 0 ? 0 : Math.max(0, d.value) / total;
      const targetCumulative = cumulative + slicePart;
      // Visible portion of THIS slice based on partial
      const sliceVisible = Math.max(0, Math.min(slicePart, partial - cumulative));
      if (sliceVisible > 0) {
        const a1 = angle;
        const a2 = angle + sliceVisible * Math.PI * 2;
        const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        const largeArc = (sliceVisible * Math.PI * 2) > Math.PI ? 1 : 0;
        svgInner += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" ${baseAttrs} />`;
        // Label at slice midpoint (only if slice is fully visible)
        if (sliceVisible >= slicePart) {
          const am = (a1 + a2) / 2;
          const lx = cx + Math.cos(am) * (r + 24);
          const ly = cy + Math.sin(am) * (r + 24) + 5;
          svgInner += `<text x="${lx}" y="${ly}" font-family="Cairo, sans-serif" font-size="20" font-weight="700" fill="${labelFill}" text-anchor="middle">${escapeHtml(d.label)} (${d.value})</text>`;
        }
      }
      angle += slicePart * Math.PI * 2;
      cumulative = targetCumulative;
    });
    g.innerHTML = svgInner;
  } else {
    // Bar / Line: shared axis box
    const max = Math.max(1, ...it.data.map(d => d.value));
    const axesX = L.plotX, axesY = L.plotY, axesH = L.plotH, axesW = L.plotW;
    let svgInner = `
      <line x1="${axesX}" y1="${axesY}" x2="${axesX}" y2="${axesY + axesH}" ${baseAttrs} />
      <line x1="${axesX}" y1="${axesY + axesH}" x2="${axesX + axesW}" y2="${axesY + axesH}" ${baseAttrs} />
    `;
    const n = it.data.length;
    if (it.chartType === 'bar') {
      const slot = axesW / n;
      const barW = slot * 0.6;
      const visibleCount = partial * n; // fractional
      it.data.forEach((d, i) => {
        const localProg = Math.max(0, Math.min(1, visibleCount - i)); // 0..1 for this bar
        if (localProg <= 0) return;
        const fullBarH = (Math.max(0, d.value) / max) * axesH;
        const barH = fullBarH * localProg;
        const x = axesX + slot * i + (slot - barW) / 2;
        const y = axesY + axesH - barH;
        svgInner += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" ${baseAttrs} />`;
        if (localProg >= 1) {
          // Value above bar
          svgInner += `<text x="${x + barW / 2}" y="${y - 8}" font-family="Cairo, sans-serif" font-size="18" font-weight="700" fill="${labelFill}" text-anchor="middle">${d.value}</text>`;
          // Label below x-axis
          svgInner += `<text x="${x + barW / 2}" y="${axesY + axesH + 26}" font-family="Cairo, sans-serif" font-size="16" fill="${labelFill}" text-anchor="middle">${escapeHtml(d.label)}</text>`;
        }
      });
    } else if (it.chartType === 'line') {
      const slot = n > 1 ? axesW / (n - 1) : axesW;
      const points = it.data.map((d, i) => {
        const x = axesX + slot * i;
        const y = axesY + axesH - (Math.max(0, d.value) / max) * axesH;
        return { x, y, v: d.value, lab: d.label };
      });
      // Draw progressive polyline based on partial
      // Find current segment
      const prog = partial * (n - 1);
      const lastFullIdx = Math.floor(prog);
      const frac = prog - lastFullIdx;
      const visiblePts = points.slice(0, lastFullIdx + 1);
      if (frac > 0 && lastFullIdx + 1 < points.length) {
        const a = points[lastFullIdx], b = points[lastFullIdx + 1];
        visiblePts.push({ x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac });
      }
      if (visiblePts.length >= 2) {
        const pts = visiblePts.map(p => `${p.x},${p.y}`).join(' ');
        svgInner += `<polyline points="${pts}" ${baseAttrs} />`;
      }
      // Dots + labels for fully-revealed points
      points.forEach((p, i) => {
        if (i <= lastFullIdx) {
          svgInner += `<circle cx="${p.x}" cy="${p.y}" r="${sw * 1.5}" fill="${it.color}" />`;
          svgInner += `<text x="${p.x}" y="${p.y - 14}" font-family="Cairo, sans-serif" font-size="16" font-weight="700" fill="${labelFill}" text-anchor="middle">${p.v}</text>`;
          svgInner += `<text x="${p.x}" y="${axesY + axesH + 26}" font-family="Cairo, sans-serif" font-size="14" fill="${labelFill}" text-anchor="middle">${escapeHtml(p.lab)}</text>`;
        }
      });
    }
    g.innerHTML = svgInner;
  }
  return g;
}

function renderChartItem(it) {
  const g = buildChartGroup(it, { partial: 1 });
  g.dataset.id = it.id;
  enableDrag(g, it);
  board.appendChild(g);
}

function animateChart(it, sc, abort) {
  return new Promise(resolve => {
    const effect = effectFor(it, sc);
    let g = buildChartGroup(it, { partial: 0 });
    g.dataset.id = it.id;
    board.appendChild(g);

    if (effect !== 'draw') {
      applyMotionEffect(g, effect, sc.duration) ||
        applyMotionEffect(g, 'pop', sc.duration);
      // After motion-effect completes, replace with full chart
      setTimeout(() => {
        const full = buildChartGroup(it, { partial: 1 });
        full.dataset.id = it.id;
        g.replaceWith(full);
        resolve();
      }, sc.duration * 1000);
      return;
    }

    // 'draw' effect: progressively reveal the chart
    drawHand.classList.add('visible');
    const start = performance.now();
    const dur = sc.duration * 1000;
    function frame(now) {
      if (abort.stop) { drawHand.classList.remove('visible'); return resolve(); }
      const t = Math.min(1, (now - start) / dur);
      const next = buildChartGroup(it, { partial: t });
      next.dataset.id = it.id;
      g.replaceWith(next);
      g = next;
      // Move hand near the rightmost drawn extent
      try {
        const bb = g.getBBox();
        positionHandAtSvgPoint(it.x + bb.x + bb.width, it.y + bb.y + bb.height * 0.4);
      } catch {}
      if (t < 1) requestAnimationFrame(frame);
      else { resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

function getItemBoundsInBoardCoords(id) {
  const el = board.querySelector(`[data-id="${id}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  if (!boardRect.width || !boardRect.height || !rect.width) return null;
  const sx = viewW / boardRect.width;
  const sy = viewH / boardRect.height;
  return {
    x1: viewX + (rect.left - boardRect.left) * sx,
    y1: viewY + (rect.top - boardRect.top) * sy,
    x2: viewX + (rect.right - boardRect.left) * sx,
    y2: viewY + (rect.bottom - boardRect.top) * sy,
  };
}

function drawSelectionHandles() {
  const old = board.querySelector('#handles-group');
  if (old) old.remove();
  if (!selectedIds.size || isPlaying) return;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', 'handles-group');

  // Multi-select: draw a thin outline around each selected item, no resize/rotate handles
  if (selectedIds.size > 1) {
    selectedIds.forEach(id => {
      const b = getItemBoundsInBoardCoords(id);
      if (!b) return;
      const pad = 14;
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('x', b.x1 - pad);
      r.setAttribute('y', b.y1 - pad);
      r.setAttribute('width', b.x2 - b.x1 + pad * 2);
      r.setAttribute('height', b.y2 - b.y1 + pad * 2);
      r.setAttribute('class', 'selected-outline multi');
      g.appendChild(r);
    });
    board.appendChild(g);
    return;
  }

  // Single select: original handles (resize + rotate)
  const it = getSelectedItem();
  if (!it) return;
  const sid = firstSelectedId();
  const el = board.querySelector(`[data-id="${sid}"]`);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  if (!boardRect.width || !boardRect.height || !rect.width) return;

  // Convert screen px → CURRENT viewBox coords (accounts for pan + zoom)
  const sx = viewW / boardRect.width;
  const sy = viewH / boardRect.height;
  const pad = 22;
  const bx1 = viewX + (rect.left - boardRect.left) * sx - pad;
  const by1 = viewY + (rect.top - boardRect.top) * sy - pad;
  const bx2 = viewX + (rect.right - boardRect.left) * sx + pad;
  const by2 = viewY + (rect.bottom - boardRect.top) * sy + pad;
  const cx = (bx1 + bx2) / 2;
  const cy = (by1 + by2) / 2;
  const corners = [
    { x: bx1, y: by1 }, { x: bx2, y: by1 },
    { x: bx2, y: by2 }, { x: bx1, y: by2 }
  ];
  const tmX = cx, tmY = by1;
  const rotPos = { x: cx, y: by1 - 60 };

  // Outline (axis-aligned, always wraps the visible content)
  const outline = document.createElementNS(SVG_NS, 'rect');
  outline.setAttribute('x', bx1); outline.setAttribute('y', by1);
  outline.setAttribute('width', bx2 - bx1); outline.setAttribute('height', by2 - by1);
  outline.setAttribute('class', 'selected-outline');
  g.appendChild(outline);

  // Line to rotation handle
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', tmX); line.setAttribute('y1', tmY);
  line.setAttribute('x2', rotPos.x); line.setAttribute('y2', rotPos.y);
  line.setAttribute('class', 'handle-line');
  g.appendChild(line);

  // Resize corner handles
  corners.forEach(c => {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', c.x - 14); r.setAttribute('y', c.y - 14);
    r.setAttribute('width', 28); r.setAttribute('height', 28);
    r.setAttribute('rx', 4);
    r.setAttribute('class', 'handle resize-handle');
    enableResizeHandle(r, it, { cx, cy });
    g.appendChild(r);
  });

  // Rotate handle
  const rh = document.createElementNS(SVG_NS, 'circle');
  rh.setAttribute('cx', rotPos.x); rh.setAttribute('cy', rotPos.y);
  rh.setAttribute('r', 18);
  rh.setAttribute('class', 'handle rotate-handle');
  enableRotateHandle(rh, it, { cx, cy });
  g.appendChild(rh);

  // Rotation icon (↻) inside
  const rotIcon = document.createElementNS(SVG_NS, 'text');
  rotIcon.setAttribute('x', rotPos.x); rotIcon.setAttribute('y', rotPos.y + 7);
  rotIcon.setAttribute('text-anchor', 'middle');
  rotIcon.setAttribute('font-size', '20');
  rotIcon.setAttribute('fill', '#fff');
  rotIcon.setAttribute('font-weight', '700');
  rotIcon.style.pointerEvents = 'none';
  rotIcon.textContent = '↻';
  g.appendChild(rotIcon);

  board.appendChild(g);
}

// Helper: get current visible center of item in board coords
function getItemVisualCenter(it) {
  const el = board.querySelector(`[data-id="${it.id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  if (!br.width) return null;
  return {
    x: viewX + ((r.left + r.right) / 2 - br.left) * (viewW / br.width),
    y: viewY + ((r.top + r.bottom) / 2 - br.top) * (viewH / br.height)
  };
}

// Resize handle — anchors scale around the original visual center.
// Listeners attach to window during drag so handle re-creation doesn't break capture.
function enableResizeHandle(handle, it, ctx) {
  handle.style.touchAction = 'none';
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    document.body.classList.add('dragging');
    const blockSelect = (ev) => ev.preventDefault();
    document.addEventListener('selectstart', blockSelect);
    const startPt = svgPoint(e);
    const anchorCx = ctx.cx, anchorCy = ctx.cy;
    const startDist = Math.hypot(startPt.x - anchorCx, startPt.y - anchorCy) || 1;
    const startScale = it.scale || 1;
    const startW = it.width || 0;
    const startH = it.height || 0;
    const startFS = it.fontSize || 0;
    beginAction();
    let committed = false;

    function onMove(ev) {
      if (!committed) { commitPending(); committed = true; }
      const pt = svgPoint(ev);
      const newDist = Math.hypot(pt.x - anchorCx, pt.y - anchorCy);
      const ratio = Math.max(0.02, newDist / startDist);
      if (it.type === 'image' || it.type === 'chart') {
        it.width = Math.max(60, startW * ratio);
        it.height = Math.max(60, startH * ratio);
      } else if (it.type === 'icon') {
        it.scale = Math.max(0.05, Math.min(8, startScale * ratio));
      } else if (it.type === 'text' || it.type === 'counter') {
        it.fontSize = Math.max(12, Math.min(600, startFS * ratio));
      }
      // Chart's internal layout depends on width/height — rebuild via full canvas render
      if (it.type === 'chart') {
        renderCanvas();
      } else {
        updateItemRender(it);
      }
      // Keep visual center fixed on the original anchor
      const c = getItemVisualCenter(it);
      if (c) {
        it.x += anchorCx - c.x; it.y += anchorCy - c.y;
        if (it.type === 'chart') renderCanvas(); else updateItemRender(it);
      }
      drawSelectionHandles();
      syncItemControls();
    }
    function onUp() {
      document.body.classList.remove('dragging');
      document.removeEventListener('selectstart', blockSelect);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      pendingSnap = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

// Rotate handle — continuous angle tracking; full 360° free rotation; window-level listeners.
function enableRotateHandle(handle, it, ctx) {
  handle.style.touchAction = 'none';
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    document.body.classList.add('dragging');
    const blockSelect = (ev) => ev.preventDefault();
    document.addEventListener('selectstart', blockSelect);
    const startPt = svgPoint(e);
    const anchorCx = ctx.cx, anchorCy = ctx.cy;
    let lastAngle = Math.atan2(startPt.y - anchorCy, startPt.x - anchorCx);
    let totalRot = it.rotation || 0;
    beginAction();
    let committed = false;

    function onMove(ev) {
      if (!committed) { commitPending(); committed = true; }
      const pt = svgPoint(ev);
      const a = Math.atan2(pt.y - anchorCy, pt.x - anchorCx);
      let delta = a - lastAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      else if (delta < -Math.PI) delta += 2 * Math.PI;
      totalRot += delta * 180 / Math.PI;
      lastAngle = a;
      const normalized = ((totalRot % 360) + 540) % 360 - 180;
      it.rotation = Math.round(normalized * 10) / 10;
      updateItemRender(it);
      drawSelectionHandles();
      syncItemControls();
    }
    function onUp() {
      document.body.classList.remove('dragging');
      document.removeEventListener('selectstart', blockSelect);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      pendingSnap = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function applyStrokeStyle(g, it) {
  const style = it.drawStyle || 'pen';
  let widthMul = 1, opacity = 1, linecap = 'round', linejoin = 'round';
  if (style === 'pencil')      { widthMul = 0.65; opacity = 0.78; }
  else if (style === 'marker') { widthMul = 1.6; linecap = 'square'; linejoin = 'miter'; }
  else if (style === 'brush')  { widthMul = 1.9; opacity = 0.85; }

  const w = (it.stroke || 2.5) * 8 * widthMul;
  g.querySelectorAll('path, circle, rect, line, polyline, polygon').forEach(p => {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', it.color);
    p.setAttribute('stroke-width', w);
    p.setAttribute('stroke-linecap', linecap);
    p.setAttribute('stroke-linejoin', linejoin);
    if (opacity !== 1) p.setAttribute('stroke-opacity', opacity);
  });
}

// =========== DRAG + SELECT ===========
function enableDrag(el, it) {
  let dragging = false, moved = false, sx = 0, sy = 0;
  let groupStart = null;  // Map<id, {x,y}> for multi-drag
  let altDupActive = false; // Alt+drag = duplicate-then-drag
  el.style.cursor = 'move';
  el.addEventListener('pointerdown', (e) => {
    if (isPlaying) return;
    if (spaceHeld || e.button === 1) return;
    e.stopPropagation();

    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) {
      toggleSelect(it.id);
      syncItemControls();
      drawSelectionHandles();
      switchPane('item');
      return; // don't initiate drag on shift-click
    }

    beginAction(); // capture pre-mutation state for undo
    altDupActive = e.altKey;

    if (altDupActive) {
      // Ensure clicked item is in selection, then duplicate the whole selection.
      // Clones overlap originals; we MUST NOT call renderCanvas() here because that would
      // remove the original `el` from the DOM and release its pointer capture.
      if (!isSelected(it.id)) selectOnly(it.id);
      const sc = currentScene();
      const originals = getSelectedItems();
      const newIds = [];
      originals.forEach(o => {
        const c = JSON.parse(JSON.stringify(o));
        c.id = nextItemId++;
        sc.items.push(c);
        newIds.push(c.id);
        // Append the clone's DOM element directly (without re-rendering the originals)
        if (c.type === 'text') renderTextItem(c);
        else if (c.type === 'counter') renderCounterItem(c);
        else if (c.type === 'image') renderImageItem(c);
        else renderIconItem(c);
      });
      selectedIds = new Set(newIds);
      renderScenes();        // updates timeline item count
      renderLayersPanel();   // updates layers list
    } else {
      if (!isSelected(it.id)) selectOnly(it.id);
    }

    syncItemControls();
    drawSelectionHandles();
    switchPane('item');

    dragging = true; moved = false;
    el.setPointerCapture(e.pointerId);
    const pt = svgPoint(e); sx = pt.x; sy = pt.y;
    groupStart = new Map();
    // groupStart tracks the *clones* (selectedIds is now the clone IDs after altDup)
    getSelectedItems().forEach(s => groupStart.set(s.id, { x: s.x, y: s.y }));
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const pt = svgPoint(e);
    const dx = pt.x - sx, dy = pt.y - sy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      if (!moved) commitPending();
      moved = true;
    }
    // Move every selected item by the same delta
    const sc = currentScene();
    sc.items.forEach(s => {
      const sp = groupStart && groupStart.get(s.id);
      if (!sp) return;
      s.x = sp.x + dx; s.y = sp.y + dy;
      updateItemRender(s);
    });
    drawSelectionHandles();
  });
  el.addEventListener('pointerup', () => {
    // For Alt+click without movement, the duplicate IS the change → commit it
    if (altDupActive && !moved && pendingSnap) commitPending();
    dragging = false; groupStart = null; altDupActive = false; pendingSnap = null;
  });
  el.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (confirm('حذف العنصر؟')) deleteItem(it.id);
  });
  // Mouse wheel for quick resize on icons
  el.addEventListener('wheel', (e) => {
    if (isPlaying || it.type !== 'icon') return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.08 : 0.92;
    it.scale = Math.max(0.05, Math.min(3, it.scale * delta));
    el.setAttribute('transform', getIconTransform(it));
    drawSelectionHandles();
    syncItemControls();
  }, { passive: false });
}

// Click empty canvas (or background) → deselect
board.addEventListener('pointerdown', (e) => {
  const t = e.target;
  if (t === board || (t.getAttribute && t.getAttribute('data-bg') === '1')) {
    clearSelection();
    syncItemControls();
    drawSelectionHandles();
  }
});

function selectItem(id) {
  selectOnly(id);
  syncItemControls();
  drawSelectionHandles();
  switchPane('item');
}

// =========== SIDEBAR TABS ===========
function switchPane(name) {
  document.querySelectorAll('.side-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.pane === name);
  });
  document.querySelectorAll('.pane').forEach(p => {
    p.classList.toggle('active', p.dataset.pane === name);
  });
}
document.querySelectorAll('.side-tab').forEach(t => {
  t.addEventListener('click', () => switchPane(t.dataset.pane));
});

// Close modals on backdrop click + ESC (except those marked data-no-backdrop-close)
document.querySelectorAll('.modal').forEach(m => {
  if (m.hasAttribute('data-no-backdrop-close')) return;
  m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.remove('show');
  });
});
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal.show').forEach(m => {
    if (m.hasAttribute('data-no-backdrop-close')) return;
    m.classList.remove('show');
  });
});

// Lightweight in-place update (avoid full re-render during drag)
function updateItemRender(it, el) {
  if (!el) el = board.querySelector(`[data-id="${it.id}"]`);
  if (!el) return;
  if (it.type === 'icon') {
    el.setAttribute('transform', getIconTransform(it));
  } else if (it.type === 'text' || it.type === 'counter') {
    el.setAttribute('x', it.x); el.setAttribute('y', it.y);
    el.setAttribute('font-size', it.fontSize);
    el.querySelectorAll('tspan').forEach(ts => ts.setAttribute('x', it.x));
    const tr = getTextTransform(it);
    if (tr) el.setAttribute('transform', tr); else el.removeAttribute('transform');
  } else if (it.type === 'image') {
    el.setAttribute('x', it.x); el.setAttribute('y', it.y);
    el.setAttribute('width', it.width); el.setAttribute('height', it.height);
    const tr = getImageTransform(it);
    if (tr) el.setAttribute('transform', tr); else el.removeAttribute('transform');
  } else if (it.type === 'chart') {
    el.setAttribute('transform', getChartTransform(it));
  }
}
function deleteItem(id) {
  const sc = currentScene();
  if (!sc.items.some(x => x.id === id)) return;
  pushHistory();
  sc.items = sc.items.filter(x => x.id !== id);
  selectedIds.delete(id);
  renderCanvas(); renderScenes(); syncItemControls();
}

function deleteSelectedItems() {
  if (!selectedIds.size) return;
  pushHistory();
  const sc = currentScene();
  sc.items = sc.items.filter(it => !selectedIds.has(it.id));
  clearSelection();
  renderCanvas(); renderScenes(); syncItemControls();
}

function duplicateSelectedItems() {
  if (!selectedIds.size) return;
  pushHistory();
  const sc = currentScene();
  const newIds = [];
  [...selectedIds].forEach(id => {
    const it = sc.items.find(x => x.id === id);
    if (!it) return;
    const clone = JSON.parse(JSON.stringify(it));
    clone.id = nextItemId++;
    clone.x = (clone.x || 0) + 30;
    clone.y = (clone.y || 0) + 30;
    sc.items.push(clone);
    newIds.push(clone.id);
  });
  selectedIds = new Set(newIds);
  renderCanvas(); renderScenes(); syncItemControls();
}

// =========== CLIPBOARD (Ctrl+C / Ctrl+X / Ctrl+V) ===========
let internalClipboard = []; // array of item snapshots (without ids)

function copySelection() {
  const sel = getSelectedItems();
  if (!sel.length) return;
  internalClipboard = sel.map(it => {
    const c = JSON.parse(JSON.stringify(it));
    delete c.id;
    return c;
  });
  flashStatus(`📋 تم نسخ ${sel.length} عنصر`);
}

function cutSelection() {
  const sel = getSelectedItems();
  if (!sel.length) return;
  internalClipboard = sel.map(it => {
    const c = JSON.parse(JSON.stringify(it));
    delete c.id;
    return c;
  });
  pushHistory();
  const sc = currentScene();
  const ids = new Set(sel.map(s => s.id));
  sc.items = sc.items.filter(it => !ids.has(it.id));
  clearSelection();
  renderCanvas(); renderScenes(); syncItemControls();
  flashStatus(`✂ تم قص ${sel.length} عنصر`);
}

function pasteFromClipboard() {
  if (!internalClipboard.length) return;
  pushHistory();
  const sc = currentScene();
  const newIds = [];
  internalClipboard.forEach(item => {
    const clone = JSON.parse(JSON.stringify(item));
    clone.id = nextItemId++;
    clone.x = (clone.x || 0) + 30;
    clone.y = (clone.y || 0) + 30;
    sc.items.push(clone);
    newIds.push(clone.id);
  });
  selectedIds = new Set(newIds);
  renderCanvas(); renderScenes(); syncItemControls();
  flashStatus(`📋 تم لصق ${newIds.length} عنصر`);
}
function svgPoint(evt) {
  const pt = board.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(board.getScreenCTM().inverse());
}

// =========== SCENES UI ===========
function renderScenes() {
  if (scenesList) scenesList.innerHTML = '';
  track.innerHTML = '';

  scenes.forEach((s, idx) => {
    const block = document.createElement('div');
    block.className = 'track-block' + (s.id === currentSceneId ? ' active' : '');
    block.title = 'انقر للتبديل • انقر مرتين لإعادة التسمية';
    block.innerHTML = `
      <button class="tb-del" title="حذف المشهد">✕</button>
      <div class="tb-name">${escapeHtml(s.name)}</div>
      <div class="tb-meta">
        <span><span class="dot">●</span> ${s.duration}s</span>
        <span>${s.items.length} عنصر</span>
      </div>
    `;
    block.onclick = (e) => {
      if (e.target.closest('.tb-del')) {
        if (scenes.length === 1) return alert('لا يمكن حذف آخر مشهد');
        if (!confirm(`حذف "${s.name}"؟`)) return;
        pushHistory();
        scenes = scenes.filter(x => x.id !== s.id);
        if (currentSceneId === s.id) currentSceneId = scenes[0].id;
        renderScenes(); renderCanvas(); syncProps();
      } else {
        currentSceneId = s.id;
        clearSelection();
        renderScenes(); renderCanvas(); syncProps(); syncItemControls();
      }
    };
    block.ondblclick = (e) => {
      e.stopPropagation();
      const newName = prompt('اسم المشهد:', s.name);
      if (newName == null) return;
      const trimmed = newName.trim();
      if (!trimmed || trimmed === s.name) return;
      pushHistory();
      s.name = trimmed;
      renderScenes();
    };
    track.appendChild(block);
  });

  // Trailing "+ مشهد" tile
  const addBtn = document.createElement('button');
  addBtn.className = 'track-add';
  addBtn.textContent = '+ مشهد';
  addBtn.title = 'إضافة مشهد جديد';
  addBtn.onclick = () => document.getElementById('btn-add-scene').click();
  track.appendChild(addBtn);

  const total = scenes.reduce((a, s) => a + s.duration, 0);
  timecode.textContent = `00:00 / ${formatTime(total)}`;
}

function formatTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// =========== PROPS ===========
const bgType = document.getElementById('bg-type');
const bgColor = document.getElementById('bg-color');
const bgLineColor = document.getElementById('bg-line-color');
const bgColorRow = document.getElementById('bg-color-row');
const bgLineColorRow = document.getElementById('bg-line-color-row');
const bgImageRow = document.getElementById('bg-image-row');
const bgUpload = document.getElementById('bg-upload');

function syncProps() {
  const s = currentScene();
  propDuration.value = s.duration;
  propEffect.value = s.effect;
  propColor.value = s.color;
  propStroke.value = s.stroke;
  // Background
  const bg = s.background || { type: 'none' };
  bgType.value = bg.type || 'none';
  bgColor.value = bg.color || '#ffffff';
  bgLineColor.value = bg.lineColor || '#cfd8e6';
  syncBgRows(bg.type);
  // Draw style + camera (deferred to bottom because elements may not exist yet on first call)
  const drawSel = document.getElementById('prop-draw-style');
  if (drawSel) drawSel.value = s.drawStyle || 'pen';
  const handSel = document.getElementById('prop-hand-style');
  if (handSel) handSel.value = projectHandStyle;
  const camChk = document.getElementById('cam-enabled');
  const camCtl = document.getElementById('cam-controls');
  const cam = s.camera;
  if (camChk) camChk.checked = !!(cam && cam.enabled);
  if (camCtl) camCtl.style.display = (cam && cam.enabled) ? '' : 'none';
  if (typeof syncCameraStatus === 'function') syncCameraStatus();
  // Exit transition
  const exitSel = document.getElementById('prop-exit-transition');
  const exitDur = document.getElementById('prop-exit-duration');
  if (exitSel) exitSel.value = s.exitTransition || 'none';
  if (exitDur) exitDur.value = s.exitDuration || 1.5;
}

function syncBgRows(type) {
  const showColor = type && type !== 'none' && type !== 'image';
  const showLine = ['grid', 'lines', 'dots', 'graph'].includes(type);
  const showImg = type === 'image';
  bgColorRow.style.display = showColor ? '' : 'none';
  bgLineColorRow.style.display = showLine ? '' : 'none';
  bgImageRow.style.display = showImg ? '' : 'none';
  const wrap = document.getElementById('bg-colors-row');
  if (wrap) wrap.style.display = (showColor || showLine) ? '' : 'none';
}

function ensureBg() {
  const s = currentScene();
  if (!s.background) s.background = { type: 'none', color: '#ffffff', lineColor: '#cfd8e6' };
  return s.background;
}

bgType.onchange = () => {
  pushHistory();
  const bg = ensureBg();
  bg.type = bgType.value;
  syncBgRows(bg.type);
  renderCanvas();
};
bgColor.addEventListener('pointerdown', beginAction);
bgColor.oninput = () => { commitPending(); ensureBg().color = bgColor.value; renderCanvas(); };
bgLineColor.addEventListener('pointerdown', beginAction);
bgLineColor.oninput = () => { commitPending(); ensureBg().lineColor = bgLineColor.value; renderCanvas(); };

bgUpload.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  pushHistory();
  const bg = ensureBg();
  bg.type = 'image';
  bg.src = dataUrl;
  bgType.value = 'image';
  syncBgRows('image');
  renderCanvas();
  e.target.value = '';
};

document.getElementById('btn-bg-clear').onclick = () => {
  const s = currentScene();
  if (!s.background || !s.background.src) return;
  pushHistory();
  delete s.background.src;
  s.background.type = 'none';
  syncProps();
  renderCanvas();
};

// =========== CAMERA / DRAW STYLE / HAND STYLE ===========
const camEnabled = document.getElementById('cam-enabled');
const camControls = document.getElementById('cam-controls');
const camStatus = document.getElementById('cam-status');
const propDrawStyle = document.getElementById('prop-draw-style');
const propHandStyle = document.getElementById('prop-hand-style');

function snapshotViewport() {
  return { x: viewX, y: viewY, w: viewW, h: viewH };
}
function applyViewport(v) {
  if (!v) return;
  viewX = v.x; viewY = v.y; viewW = v.w; viewH = v.h;
  updateViewBox();
}
function ensureCamera() {
  const s = currentScene();
  if (!s.camera) s.camera = { enabled: false, start: null, end: null };
  return s.camera;
}
function syncCameraStatus() {
  const s = currentScene();
  const cam = s.camera;
  const hasStart = cam && cam.start;
  const hasEnd = cam && cam.end;
  camStatus.innerHTML = `
    <div class="badge ${hasStart ? 'set' : ''}">${hasStart ? '✓ بداية' : 'بداية —'}</div>
    <div class="badge ${hasEnd ? 'set' : ''}">${hasEnd ? '✓ نهاية' : 'نهاية —'}</div>
  `;
}

camEnabled.onchange = () => {
  pushHistory();
  const cam = ensureCamera();
  cam.enabled = camEnabled.checked;
  camControls.style.display = cam.enabled ? '' : 'none';
  syncCameraStatus();
};
document.getElementById('cam-set-start').onclick = () => {
  pushHistory();
  ensureCamera().start = snapshotViewport();
  syncCameraStatus();
  flashStatus('✓ تم حفظ نقطة البداية');
};
document.getElementById('cam-set-end').onclick = () => {
  pushHistory();
  ensureCamera().end = snapshotViewport();
  syncCameraStatus();
  flashStatus('✓ تم حفظ نقطة النهاية');
};
document.getElementById('cam-view-start').onclick = () => {
  const cam = currentScene().camera;
  if (cam && cam.start) applyViewport(cam.start);
};
document.getElementById('cam-view-end').onclick = () => {
  const cam = currentScene().camera;
  if (cam && cam.end) applyViewport(cam.end);
};
document.getElementById('cam-reset').onclick = () => {
  pushHistory();
  const cam = ensureCamera();
  cam.start = null; cam.end = null;
  resetView();
  syncCameraStatus();
};

propDrawStyle.onchange = () => {
  pushHistory();
  const s = currentScene();
  s.drawStyle = propDrawStyle.value;
  // Apply to all existing items in this scene so it's visible immediately
  s.items.forEach(it => { if (it.type === 'icon') it.drawStyle = s.drawStyle; });
  renderCanvas();
};

propHandStyle.onchange = () => {
  setHandStyle(propHandStyle.value);
  showHandTipEditor();
};

// ===== Hand size =====
const HAND_SIZE_KEY = 'wb_hand_size';
function setHandSize(px) {
  const v = Math.max(60, Math.min(500, parseInt(px) || 200));
  drawHand.style.width = v + 'px';
  localStorage.setItem(HAND_SIZE_KEY, String(v));
}
const ctrlHandSize = document.getElementById('ctrl-hand-size');
const lblHandSize = document.getElementById('lbl-hand-size');
const savedHandSize = parseInt(localStorage.getItem(HAND_SIZE_KEY)) || 200;
ctrlHandSize.value = savedHandSize;
lblHandSize.textContent = savedHandSize;
setHandSize(savedHandSize);
ctrlHandSize.oninput = () => {
  const v = parseInt(ctrlHandSize.value);
  lblHandSize.textContent = v;
  setHandSize(v);
};

function rebuildHandDropdown() {
  const sel = propHandStyle;
  const cur = sel.value;
  sel.innerHTML = `
    <option value="hand-light">✋ يد فاتحة + قلم</option>
    <option value="hand-dark">✊ يد داكنة + قلم</option>
    <option value="pencil">✏️ قلم رصاص</option>
    <option value="marker">🖊 ماركر</option>
    <option value="brush">🖌 فرشاة</option>
  `;
  if (customHands.length) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '——— أيدى مخصصة ———';
    sel.appendChild(sep);
    customHands.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = '🖼 ' + h.name;
      sel.appendChild(opt);
    });
  }
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
rebuildHandDropdown();

document.getElementById('hand-upload').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('الملف لازم يكون صورة');
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const baseName = (file.name || '').replace(/\.[^.]+$/, '').trim();
  const name = baseName || ('يد مخصصة ' + (customHands.length + 1));
  const id = 'cust_' + Date.now();
  customHands.push({ id, name, src: dataUrl, tipX: 0.05, tipY: 0.05 });
  saveCustomHands();
  rebuildHandDropdown();
  setHandStyle(id);
  propHandStyle.value = id;
  showHandTipEditor();
  flashStatus(`✓ تم إضافة "${name}" — اضبطى رأس القلم`);
  e.target.value = '';
};

// ===== Hand tip editor (operates on the currently selected custom hand) =====
const handTipEditor = document.getElementById('hand-tip-editor');
const handPreview = document.getElementById('hand-preview');
const handPreviewWrap = document.getElementById('hand-preview-wrap');
const handTipMarker = document.getElementById('hand-tip-marker');
const ctrlTipX = document.getElementById('ctrl-tip-x');
const ctrlTipY = document.getElementById('ctrl-tip-y');
const lblTipX = document.getElementById('lbl-tip-x');
const lblTipY = document.getElementById('lbl-tip-y');

function getCurrentCustom() { return findCustomHand(projectHandStyle); }

function showHandTipEditor() {
  const cur = getCurrentCustom();
  if (!cur) { handTipEditor.style.display = 'none'; return; }
  handTipEditor.style.display = '';
  handPreview.src = cur.src;
  ctrlTipX.value = Math.round(cur.tipX * 100);
  ctrlTipY.value = Math.round(cur.tipY * 100);
  lblTipX.textContent = ctrlTipX.value;
  lblTipY.textContent = ctrlTipY.value;
  handPreview.onload = updateTipMarker;
  if (handPreview.complete) updateTipMarker();
}

function updateTipMarker() {
  const cur = getCurrentCustom();
  if (!cur) return;
  const r = handPreview.getBoundingClientRect();
  const wrapR = handPreviewWrap.getBoundingClientRect();
  handTipMarker.style.left = ((r.left - wrapR.left) + cur.tipX * r.width) + 'px';
  handTipMarker.style.top  = ((r.top - wrapR.top) + cur.tipY * r.height) + 'px';
}

ctrlTipX.oninput = () => {
  const cur = getCurrentCustom(); if (!cur) return;
  cur.tipX = parseInt(ctrlTipX.value) / 100;
  lblTipX.textContent = ctrlTipX.value;
  saveCustomHands();
  if (projectHandStyle === cur.id) currentHandTipFrac.x = cur.tipX;
  updateTipMarker();
};
ctrlTipY.oninput = () => {
  const cur = getCurrentCustom(); if (!cur) return;
  cur.tipY = parseInt(ctrlTipY.value) / 100;
  lblTipY.textContent = ctrlTipY.value;
  saveCustomHands();
  if (projectHandStyle === cur.id) currentHandTipFrac.y = cur.tipY;
  updateTipMarker();
};

handPreviewWrap.addEventListener('click', (e) => {
  const cur = getCurrentCustom(); if (!cur) return;
  const r = handPreview.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  if (px < 0 || px > 1 || py < 0 || py > 1) return;
  cur.tipX = Math.max(0, Math.min(1, px));
  cur.tipY = Math.max(0, Math.min(1, py));
  ctrlTipX.value = Math.round(cur.tipX * 100);
  ctrlTipY.value = Math.round(cur.tipY * 100);
  lblTipX.textContent = ctrlTipX.value;
  lblTipY.textContent = ctrlTipY.value;
  saveCustomHands();
  if (projectHandStyle === cur.id) currentHandTipFrac = { x: cur.tipX, y: cur.tipY };
  updateTipMarker();
});

document.getElementById('hand-delete').onclick = () => {
  const cur = getCurrentCustom();
  if (!cur) return;
  if (!confirm(`حذف "${cur.name}"؟`)) return;
  customHands = customHands.filter(h => h.id !== cur.id);
  saveCustomHands();
  rebuildHandDropdown();
  setHandStyle('hand-light');
  propHandStyle.value = 'hand-light';
  handTipEditor.style.display = 'none';
  flashStatus('✓ تم حذف اليد');
};
propDuration.addEventListener('pointerdown', beginAction);
propDuration.addEventListener('focus', beginAction);
propDuration.oninput = () => { commitPending(); currentScene().duration = parseFloat(propDuration.value) || 1; renderScenes(); };
propEffect.addEventListener('focus', beginAction);
propEffect.onchange = () => { commitPending(); currentScene().effect = propEffect.value; };
propColor.addEventListener('pointerdown', beginAction);
propColor.oninput   = () => {
  commitPending();
  const s = currentScene(); s.color = propColor.value;
  s.items.forEach(it => it.color = s.color); renderCanvas();
};
propStroke.addEventListener('pointerdown', beginAction);
propStroke.oninput  = () => {
  commitPending();
  const s = currentScene(); s.stroke = parseFloat(propStroke.value);
  s.items.forEach(it => { if (it.type !== 'text') it.stroke = s.stroke; }); renderCanvas();
};

// =========== ITEM CONTROLS PANEL ===========
const itemControls = document.getElementById('item-controls');
const ctrlScale = document.getElementById('ctrl-scale');
const ctrlRot = document.getElementById('ctrl-rot');
const lblScale = document.getElementById('lbl-scale');
const lblRot = document.getElementById('lbl-rot');
const ctrlFont = document.getElementById('ctrl-font');
const ctrlFontRow = document.getElementById('ctrl-font-row');

const textFormatBlock = document.getElementById('text-format-block');
const ctrlBold = document.getElementById('ctrl-bold');
const ctrlItalic = document.getElementById('ctrl-italic');
const ctrlUnderline = document.getElementById('ctrl-underline');
const ctrlAlign = document.getElementById('ctrl-align');
const ctrlLineHeight = document.getElementById('ctrl-line-height');
const lblLineHeight = document.getElementById('lbl-line-height');
const ctrlEditText = document.getElementById('ctrl-edit-text');

const counterBlock = document.getElementById('counter-block');
const ctrlCounterFrom = document.getElementById('ctrl-counter-from');
const ctrlCounterTo = document.getElementById('ctrl-counter-to');
const ctrlCounterDecimals = document.getElementById('ctrl-counter-decimals');
const ctrlCounterPrefix = document.getElementById('ctrl-counter-prefix');
const ctrlCounterSuffix = document.getElementById('ctrl-counter-suffix');
const ctrlCounterSep = document.getElementById('ctrl-counter-sep');

// =========== TEXT MODAL ===========
const textModal = document.getElementById('text-modal');
const textModalInput = document.getElementById('text-modal-input');
const textModalTitle = document.getElementById('text-modal-title');

function openTextModal({ initial = '', title = 'نص جديد' } = {}) {
  return new Promise(resolve => {
    textModalInput.value = initial;
    textModalTitle.textContent = title;
    textModal.classList.add('show');
    setTimeout(() => textModalInput.focus(), 50);
    const cleanup = () => {
      textModal.classList.remove('show');
      document.getElementById('text-modal-ok').onclick = null;
      document.getElementById('text-modal-cancel').onclick = null;
      document.getElementById('text-modal-close').onclick = null;
    };
    document.getElementById('text-modal-ok').onclick = () => {
      const v = textModalInput.value;
      cleanup();
      resolve(v.trim() ? v : null);
    };
    document.getElementById('text-modal-cancel').onclick = () => { cleanup(); resolve(null); };
    document.getElementById('text-modal-close').onclick = () => { cleanup(); resolve(null); };
  });
}

function getSelectedItem() {
  const id = firstSelectedId();
  if (!id) return null;
  return currentScene().items.find(it => it.id === id) || null;
}

function syncMultiSelectHeader(selArr) {
  const hdr = document.getElementById('multi-header');
  const cnt = document.getElementById('multi-count');
  const isMulti = selArr.length > 1;
  if (hdr) hdr.style.display = isMulti ? '' : 'none';
  if (cnt) cnt.textContent = selArr.length;
  // In multi-select, hide type-specific blocks (font, format, counter) unless ALL same type
  const types = new Set(selArr.map(s => s.type));
  const allSameType = types.size === 1;
  const transformSection = document.getElementById('transform-section');
  // Hide scale/rotation sliders when multi (per-item operations don't make sense as a single value)
  if (transformSection) {
    const ctrlScaleRow = ctrlScale.closest('.prop-row');
    const ctrlRotRow = ctrlRot.closest('.prop-row');
    if (ctrlScaleRow) ctrlScaleRow.style.display = isMulti ? 'none' : '';
    if (ctrlRotRow) ctrlRotRow.style.display = isMulti ? 'none' : '';
  }
}

function syncItemControls() {
  const noSelEl = document.getElementById('no-selection');
  const sel = getSelectedItems();
  const it = sel[0] || null;
  if (!it) {
    itemControls.style.display = 'none';
    if (noSelEl) noSelEl.style.display = '';
    return;
  }
  itemControls.style.display = 'block';
  if (noSelEl) noSelEl.style.display = 'none';
  syncMultiSelectHeader(sel);
  if (it.type === 'icon') {
    ctrlScale.min = 10; ctrlScale.max = 300;
    ctrlScale.value = Math.round(it.scale * 100);
    lblScale.textContent = Math.round(it.scale * 100) + '%';
  } else if (it.type === 'text') {
    ctrlScale.min = 12; ctrlScale.max = 400;
    ctrlScale.value = Math.round(it.fontSize);
    lblScale.textContent = it.fontSize + 'px';
    ctrlFont.value = it.fontFamily || 'Cairo';
    ctrlBold.classList.toggle('active', it.bold !== false);
    ctrlItalic.classList.toggle('active', !!it.italic);
    ctrlUnderline.classList.toggle('active', !!it.underline);
    ctrlAlign.value = it.align || 'start';
    ctrlLineHeight.value = it.lineHeight || 1.2;
    lblLineHeight.textContent = (it.lineHeight || 1.2).toFixed(1);
  } else if (it.type === 'counter') {
    ctrlScale.min = 12; ctrlScale.max = 400;
    ctrlScale.value = Math.round(it.fontSize);
    lblScale.textContent = it.fontSize + 'px';
    ctrlFont.value = it.fontFamily || 'Cairo';
    ctrlCounterFrom.value = it.from ?? 0;
    ctrlCounterTo.value = it.to ?? 100;
    ctrlCounterDecimals.value = it.decimals ?? 0;
    ctrlCounterPrefix.value = it.prefix || '';
    ctrlCounterSuffix.value = it.suffix || '';
    ctrlCounterSep.classList.toggle('active', it.separator !== false);
  } else if (it.type === 'chart') {
    ctrlScale.min = 200; ctrlScale.max = 1280;
    ctrlScale.value = Math.round(it.width);
    lblScale.textContent = Math.round(it.width) + 'px';
    document.getElementById('ctrl-chart-type').value = it.chartType || 'bar';
    renderChartDataRows(it);
  } else if (it.type === 'image') {
    ctrlScale.min = 30; ctrlScale.max = 1500;
    ctrlScale.value = Math.round(it.width);
    lblScale.textContent = Math.round(it.width) + 'px';
  }
  ctrlRot.value = it.rotation || 0;
  lblRot.textContent = (it.rotation || 0) + '°';

  // Effect dropdown: in multi-select, show common value or empty
  const effects = new Set(sel.map(s => s.effect || ''));
  ctrlEffect.value = effects.size === 1 ? [...effects][0] : '';

  // Type-specific blocks: only show when ALL selected are the same type
  const types = new Set(sel.map(s => s.type));
  const allText = types.size === 1 && [...types][0] === 'text';
  const allCounter = types.size === 1 && [...types][0] === 'counter';
  const allTextish = types.size === 1 && (allText || allCounter);
  ctrlFontRow.style.display = allTextish ? '' : 'none';
  textFormatBlock.style.display = allText ? '' : 'none';
  counterBlock.style.display = allCounter ? '' : 'none';
  const allChart = types.size === 1 && [...types][0] === 'chart';
  const chartBlock = document.getElementById('chart-block');
  if (chartBlock) chartBlock.style.display = allChart ? '' : 'none';
}

ctrlFont.onchange = () => {
  const it = getSelectedItem(); if (!it) return;
  if (it.type !== 'text' && it.type !== 'counter') return;
  pushHistory();
  it.fontFamily = ctrlFont.value;
  renderCanvas();
};

ctrlScale.addEventListener('pointerdown', beginAction);
ctrlScale.oninput = () => {
  const it = getSelectedItem(); if (!it) return;
  commitPending();
  const v = parseInt(ctrlScale.value);
  if (it.type === 'icon') { it.scale = v / 100; lblScale.textContent = v + '%'; }
  else if (it.type === 'text' || it.type === 'counter') { it.fontSize = v; lblScale.textContent = v + 'px'; }
  else if (it.type === 'image' || it.type === 'chart') {
    const ratio = v / it.width;
    it.width = v; it.height = it.height * ratio;
    lblScale.textContent = v + 'px';
  }
  renderCanvas();
};
ctrlRot.addEventListener('pointerdown', beginAction);
ctrlRot.oninput = () => {
  const it = getSelectedItem(); if (!it) return;
  commitPending();
  it.rotation = parseInt(ctrlRot.value);
  lblRot.textContent = it.rotation + '°';
  renderCanvas();
};
document.getElementById('ctrl-flip-x').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  pushHistory();
  it.flipX = !it.flipX; renderCanvas();
};
document.getElementById('ctrl-flip-y').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  pushHistory();
  it.flipY = !it.flipY; renderCanvas();
};
document.getElementById('ctrl-front').onclick = () => {
  if (!selectedIds.size) return;
  pushHistory();
  const sc = currentScene();
  const moving = sc.items.filter(it => selectedIds.has(it.id));
  sc.items = sc.items.filter(it => !selectedIds.has(it.id)).concat(moving);
  renderCanvas();
};
document.getElementById('ctrl-back').onclick = () => {
  if (!selectedIds.size) return;
  pushHistory();
  const sc = currentScene();
  const moving = sc.items.filter(it => selectedIds.has(it.id));
  sc.items = moving.concat(sc.items.filter(it => !selectedIds.has(it.id)));
  renderCanvas();
};
document.getElementById('ctrl-reset').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  pushHistory();
  it.rotation = 0; it.flipX = false; it.flipY = false;
  if (it.type === 'icon') it.scale = 0.6;
  else if (it.type === 'counter') it.fontSize = 120;
  else it.fontSize = 80;
  renderCanvas(); syncItemControls();
};
document.getElementById('ctrl-duplicate').onclick = () => {
  if (!selectedIds.size) return;
  duplicateSelectedItems();
};

// ===== Per-item effect dropdown =====
const ctrlEffect = document.getElementById('ctrl-effect');
ctrlEffect.onchange = () => {
  if (!selectedIds.size) return;
  pushHistory();
  const v = ctrlEffect.value;
  getSelectedItems().forEach(it => {
    if (v) it.effect = v;
    else delete it.effect;
  });
};

// ===== Text format wiring =====
ctrlBold.onclick = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'text') return;
  pushHistory();
  it.bold = it.bold === false ? true : !it.bold;
  if (it.bold === undefined) it.bold = true;
  renderCanvas(); syncItemControls();
};
ctrlItalic.onclick = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'text') return;
  pushHistory();
  it.italic = !it.italic;
  renderCanvas(); syncItemControls();
};
ctrlUnderline.onclick = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'text') return;
  pushHistory();
  it.underline = !it.underline;
  renderCanvas(); syncItemControls();
};
ctrlAlign.onchange = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'text') return;
  pushHistory();
  it.align = ctrlAlign.value;
  renderCanvas();
};
ctrlLineHeight.addEventListener('pointerdown', beginAction);
ctrlLineHeight.oninput = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'text') return;
  commitPending();
  it.lineHeight = parseFloat(ctrlLineHeight.value);
  lblLineHeight.textContent = it.lineHeight.toFixed(1);
  renderCanvas();
};
ctrlEditText.onclick = async () => {
  const it = getSelectedItem(); if (!it || it.type !== 'text') return;
  const v = await openTextModal({ initial: it.text, title: 'تعديل النص' });
  if (v == null) return;
  pushHistory();
  it.text = v;
  it.isRTL = /[؀-ۿ]/.test(v);
  renderCanvas(); drawSelectionHandles();
};

// ===== Counter wiring =====
function bindCounterInput(el, key, parse) {
  el.addEventListener('focus', beginAction);
  el.addEventListener('change', () => {
    const it = getSelectedItem(); if (!it || it.type !== 'counter') return;
    commitPending();
    it[key] = parse(el.value);
    renderCanvas();
  });
}
bindCounterInput(ctrlCounterFrom, 'from', v => parseFloat(v) || 0);
bindCounterInput(ctrlCounterTo, 'to', v => parseFloat(v) || 0);
bindCounterInput(ctrlCounterDecimals, 'decimals', v => Math.max(0, Math.min(6, parseInt(v) || 0)));
bindCounterInput(ctrlCounterPrefix, 'prefix', v => v);
bindCounterInput(ctrlCounterSuffix, 'suffix', v => v);
ctrlCounterSep.onclick = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'counter') return;
  pushHistory();
  it.separator = it.separator === false ? true : !it.separator;
  if (it.separator === undefined) it.separator = true;
  renderCanvas(); syncItemControls();
};

// ===== Chart wiring =====
const ctrlChartType = document.getElementById('ctrl-chart-type');
const ctrlChartAdd = document.getElementById('ctrl-chart-add');
const chartDataRowsEl = document.getElementById('chart-data-rows');

ctrlChartType.onchange = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'chart') return;
  pushHistory();
  it.chartType = ctrlChartType.value;
  renderCanvas();
};

ctrlChartAdd.onclick = () => {
  const it = getSelectedItem(); if (!it || it.type !== 'chart') return;
  pushHistory();
  it.data.push({ label: 'بند', value: 50 });
  renderCanvas();
  renderChartDataRows(it);
};

function renderChartDataRows(it) {
  if (!chartDataRowsEl) return;
  chartDataRowsEl.innerHTML = '';
  (it.data || []).forEach((d, idx) => {
    const row = document.createElement('div');
    row.className = 'chart-data-row';
    row.innerHTML = `
      <input type="text" value="${escapeHtml(d.label || '')}" placeholder="التسمية" data-field="label" />
      <input type="number" value="${d.value || 0}" placeholder="القيمة" data-field="value" step="1" />
      <button class="chart-row-del" title="حذف الصف">✕</button>
    `;
    const inputs = row.querySelectorAll('input');
    inputs.forEach(inp => {
      inp.addEventListener('focus', beginAction);
      inp.addEventListener('change', () => {
        commitPending();
        const sel = getSelectedItem(); if (!sel || sel.type !== 'chart') return;
        if (inp.dataset.field === 'value') sel.data[idx].value = parseFloat(inp.value) || 0;
        else sel.data[idx].label = inp.value;
        renderCanvas();
      });
    });
    row.querySelector('.chart-row-del').onclick = () => {
      const sel = getSelectedItem(); if (!sel || sel.type !== 'chart') return;
      if (sel.data.length <= 1) return; // keep at least one
      pushHistory();
      sel.data.splice(idx, 1);
      renderCanvas();
      renderChartDataRows(sel);
    };
    chartDataRowsEl.appendChild(row);
  });
}

// ===== Scene exit transition wiring =====
const propExitTransition = document.getElementById('prop-exit-transition');
const propExitDuration = document.getElementById('prop-exit-duration');
propExitTransition.onchange = () => {
  pushHistory();
  currentScene().exitTransition = propExitTransition.value;
};
propExitDuration.addEventListener('focus', beginAction);
propExitDuration.onchange = () => {
  commitPending();
  currentScene().exitDuration = parseFloat(propExitDuration.value) || 1.5;
};
document.getElementById('ctrl-delete').onclick = () => {
  if (!selectedIds.size) return;
  if (selectedIds.size > 1 && !confirm(`حذف ${selectedIds.size} عناصر؟`)) return;
  deleteSelectedItems();
};

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (isPlaying) return;
  const tag = (e.target.tagName || '').toLowerCase();
  const inField = tag === 'input' || tag === 'textarea' || tag === 'select';

  // Use e.code (physical key position) so shortcuts work in Arabic keyboard layout too
  // Global shortcuts (Ctrl+S works in fields too)
  if (e.ctrlKey || e.metaKey) {
    if (e.code === 'KeyS') {
      e.preventDefault();
      if (e.altKey) toggleAutoSave();
      else doSave(false);
      return;
    }
  }
  if ((e.ctrlKey || e.metaKey) && !inField) {
    if (e.code === 'KeyZ') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if (e.code === 'KeyY') { e.preventDefault(); redo(); return; }
    if (e.code === 'KeyA') {
      e.preventDefault();
      const sc = currentScene();
      sc.items.forEach(it => selectedIds.add(it.id));
      syncItemControls(); drawSelectionHandles(); renderLayersPanel();
      return;
    }
    if (e.code === 'KeyC') { e.preventDefault(); copySelection(); return; }
    if (e.code === 'KeyX') { e.preventDefault(); cutSelection(); return; }
    if (e.code === 'KeyV') { e.preventDefault(); pasteFromClipboard(); return; }
  }

  const it = getSelectedItem(); if (!it) return;
  if (inField) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelectedItems(); }
  else if (e.code === 'KeyR') { pushHistory(); it.rotation = ((it.rotation || 0) + 15) % 360; renderCanvas(); syncItemControls(); }
  else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'Equal') {
    pushHistory();
    if (it.type === 'icon') it.scale = Math.min(3, it.scale * 1.1);
    else if (it.type === 'text' || it.type === 'counter') it.fontSize = Math.min(400, it.fontSize + 8);
    else if (it.type === 'image') { it.width *= 1.1; it.height *= 1.1; }
    renderCanvas(); syncItemControls();
  }
  else if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
    pushHistory();
    if (it.type === 'icon') it.scale = Math.max(0.05, it.scale * 0.9);
    else if (it.type === 'text' || it.type === 'counter') it.fontSize = Math.max(12, it.fontSize - 8);
    else if (it.type === 'image') { it.width *= 0.9; it.height *= 0.9; }
    renderCanvas(); syncItemControls();
  }
});

// =========== TOOLBAR ACTIONS ===========
document.getElementById('btn-add-scene').onclick = () => {
  pushHistory();
  const id = nextSceneId++;
  // Inherit draw style + camera off from current scene
  const cur = currentScene();
  scenes.push({
    id,
    name: `مشهد ${scenes.length + 1}`,
    items: [],
    duration: 3,
    effect: 'draw',
    color: '#222',
    stroke: 2.5,
    background: null,
    drawStyle: (cur && cur.drawStyle) || 'pen',
    camera: null
  });
  currentSceneId = id;
  renderScenes(); renderCanvas(); syncProps();
};

// Undo / Redo toolbar buttons
document.getElementById('btn-undo').onclick = undo;
document.getElementById('btn-redo').onclick = redo;

document.getElementById('btn-add-text').onclick = async () => {
  const text = await openTextModal({ initial: 'مرحبا بالعالم', title: 'نص جديد' });
  if (text != null && text.trim()) addTextToScene(text);
};

document.getElementById('btn-add-counter').onclick = () => {
  addCounterToScene();
};

document.getElementById('btn-add-chart').onclick = () => {
  addChartToScene();
};

document.getElementById('upload-svg').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const match = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (!match) return alert('ملف SVG غير صالح');
  addIconToScene(match[1]);
};

document.getElementById('upload-image').onchange = async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    try { await addImageFromFile(file); } catch (err) { console.error(err); alert('فشل تحميل الصورة'); }
  }
  e.target.value = '';
};

// Audio upload (local + uploads to server in background)
document.getElementById('audio-upload').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  bgAudio.src = URL.createObjectURL(file);
  bgAudio.style.display = 'block';
  try {
    const { url } = await WB_API.Uploads.file(file);
    bgAudio.dataset.serverUrl = url;
    flashStatus('✓ تم رفع الصوت');
  } catch (err) { console.warn('Audio upload failed', err); }
};

// Save / Load via backend API
let currentProjectId = null;

document.getElementById('btn-save').onclick = (e) => {
  // Right-click / Alt+click toggles auto-save
  if (e.altKey) { toggleAutoSave(); return; }
  doSave(false);
};
// Right-click on save button → toggle auto-save
document.getElementById('btn-save').oncontextmenu = (e) => {
  e.preventDefault();
  toggleAutoSave();
};

document.getElementById('btn-load').onclick = async () => {
  try {
    const list = await WB_API.Projects.list();
    showProjectsModal(list);
  } catch (e) { alert('فشل الجلب: ' + e.message); }
};

function showProjectsModal(list) {
  const modal = document.getElementById('projects-modal');
  const listEl = document.getElementById('projects-list');
  listEl.innerHTML = '';
  if (!list.length) {
    listEl.innerHTML = '<p class="muted">لا توجد مشاريع محفوظة بعد</p>';
  } else {
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';
      const date = new Date(p.updated_at * 1000).toLocaleString('ar-EG');
      card.innerHTML = `
        <div class="info">
          <h4 class="project-card-name">${escapeHtml(p.name)}</h4>
          <p>آخر تعديل: ${date}</p>
        </div>
        <div class="actions-mini">
          <button class="btn-ghost btn-sm open-btn">فتح</button>
          <button class="btn-ghost btn-sm rename-btn" title="إعادة تسمية">✏️</button>
          <button class="del-btn" title="حذف">🗑</button>
        </div>`;
      const openBtn = card.querySelector('.open-btn');
      const renameBtn = card.querySelector('.rename-btn');
      const delBtn = card.querySelector('.del-btn');
      openBtn.onclick = (e) => { e.stopPropagation(); loadProject(p.id); };
      renameBtn.onclick = async (e) => {
        e.stopPropagation();
        const newName = prompt('الاسم الجديد:', p.name);
        if (newName == null) return;
        const trimmed = newName.trim();
        if (!trimmed || trimmed === p.name) return;
        try {
          await WB_API.Projects.update(p.id, { name: trimmed });
          // If renaming the currently open project, sync the topbar input too
          if (currentProjectId === p.id) {
            document.getElementById('project-name').value = trimmed;
          }
          flashStatus('✓ تم تغيير الاسم');
          const fresh = await WB_API.Projects.list();
          showProjectsModal(fresh);
        } catch (err) {
          alert('فشل تغيير الاسم: ' + err.message);
        }
      };
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`حذف "${p.name}"؟`)) return;
        await WB_API.Projects.remove(p.id);
        const fresh = await WB_API.Projects.list();
        showProjectsModal(fresh);
      };
      card.onclick = () => loadProject(p.id);
      listEl.appendChild(card);
    });
  }
  modal.classList.add('show');
}
document.getElementById('projects-close').onclick = () =>
  document.getElementById('projects-modal').classList.remove('show');

async function loadProject(id) {
  try {
    const p = await WB_API.Projects.get(id);
    if (!p.data || !p.data.scenes) return alert('بيانات المشروع تالفة');
    suppressAutoSave = true;
    clearTimeout(autoSaveTimer);
    scenes = p.data.scenes;
    nextItemId = p.data.nextItemId || (Math.max(0, ...scenes.flatMap(s => s.items.map(i => i.id))) + 1);
    nextSceneId = p.data.nextSceneId || (Math.max(0, ...scenes.map(s => s.id)) + 1);
    currentSceneId = scenes[0].id;
    currentProjectId = p.id;
    clearSelection();
    setHandStyle(p.data.handStyle || 'hand-light');
    document.getElementById('project-name').value = p.name;
    if (p.data.audioUrl) {
      bgAudio.src = p.data.audioUrl;
      bgAudio.dataset.serverUrl = p.data.audioUrl;
      bgAudio.style.display = 'block';
    } else {
      bgAudio.removeAttribute('src'); bgAudio.style.display = 'none';
      delete bgAudio.dataset.serverUrl;
    }
    resetHistory();
    renderScenes(); renderCanvas(); syncProps(); syncItemControls();
    document.getElementById('projects-modal').classList.remove('show');
    flashStatus('✓ تم فتح المشروع');
    setSaveStatus('idle');
    setTimeout(() => { suppressAutoSave = false; }, 50);
  } catch (e) { alert('فشل الفتح: ' + e.message); }
}

function flashStatus(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:var(--success);color:#0a0a0a;padding:8px 16px;border-radius:6px;font-weight:700;z-index:300;font-family:Cairo;';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// =========== PLAYBACK ===========
const btnPlay = document.getElementById('btn-play');
const btnStop = document.getElementById('btn-stop');

btnPlay.onclick = async () => {
  if (isPlaying) return;
  await runPlayback();
};
btnStop.onclick = () => stopPlayback();

function stopPlayback() {
  if (playAbort) playAbort.stop = true;
  isPlaying = false;
  btnPlay.disabled = false;
  drawHand.classList.remove('visible');
  if (bgAudio.src) { bgAudio.pause(); bgAudio.currentTime = 0; }
  resetView();
  renderCanvas();
}

async function runPlayback(onSceneStart) {
  isPlaying = true;
  playAbort = { stop: false };
  btnPlay.disabled = true;
  if (bgAudio.src) {
    const trimS = parseFloat((ctrlTrimStart && ctrlTrimStart.value) || 0);
    bgAudio.currentTime = trimS;
    bgAudio.play().catch(() => {});
  }
  for (const sc of scenes) {
    if (playAbort.stop) break;
    currentSceneId = sc.id;
    renderScenes(); renderCanvas(); syncProps();
    if (onSceneStart) onSceneStart(sc);
    await playScene(sc, playAbort);
  }
  drawHand.classList.remove('visible');
  if (bgAudio.src) bgAudio.pause();
  isPlaying = false;
  btnPlay.disabled = false;
  resetView();
  renderCanvas();
}

async function playScene(sc, abort) {
  board.innerHTML = '';
  renderBackground(sc);

  // Camera animation runs in parallel over the entire scene's total duration
  const totalMs = Math.max(1, sc.items.length) * sc.duration * 1000;
  let cameraPromise = Promise.resolve();
  if (sc.camera && sc.camera.enabled && sc.camera.start && sc.camera.end) {
    cameraPromise = animateCamera(sc.camera, totalMs, abort);
  }

  for (const it of sc.items) {
    if (abort.stop) break;
    if (it.type === 'text') await animateText(it, sc, abort);
    else if (it.type === 'counter') await animateCounter(it, sc, abort);
    else if (it.type === 'chart') await animateChart(it, sc, abort);
    else if (it.type === 'image') await animateImage(it, sc, abort);
    else await animateIcon(it, sc, abort);
  }
  await cameraPromise;
  // Exit transition (erase / fade) after scene completes
  if (sc.exitTransition && sc.exitTransition !== 'none') {
    await runExitTransition(sc, abort);
  }
}

async function runExitTransition(sc, abort) {
  const dur = (sc.exitDuration || 1.5) * 1000;
  if (sc.exitTransition === 'fade') {
    return new Promise(resolve => {
      const a = board.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, fill: 'forwards' });
      a.onfinish = () => { board.style.opacity = ''; resolve(); };
      const interval = setInterval(() => { if (abort.stop) { try { a.cancel(); } catch {} clearInterval(interval); resolve(); } }, 50);
      setTimeout(() => clearInterval(interval), dur + 50);
    });
  }
  if (sc.exitTransition === 'erase') {
    return new Promise(resolve => {
      // Build a clipPath that shrinks across the scene from right→left (RTL natural)
      let defs = board.querySelector('defs');
      if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); board.appendChild(defs); }
      const clipId = 'exit-clip-' + Date.now();
      const cp = document.createElementNS(SVG_NS, 'clipPath');
      cp.setAttribute('id', clipId);
      const cpRect = document.createElementNS(SVG_NS, 'rect');
      cpRect.setAttribute('x', '0');
      cpRect.setAttribute('y', '0');
      cpRect.setAttribute('width', '1280');
      cpRect.setAttribute('height', '720');
      cp.appendChild(cpRect);
      defs.appendChild(cp);

      // Apply clip to all top-level scene content (except defs and handles-group)
      const clipped = [];
      [...board.children].forEach(c => {
        if (c.tagName === 'defs' || c.id === 'handles-group') return;
        c.setAttribute('clip-path', `url(#${clipId})`);
        clipped.push(c);
      });

      drawHand.classList.add('visible');
      const start = performance.now();
      function frame(now) {
        if (abort.stop) {
          drawHand.classList.remove('visible');
          clipped.forEach(c => c.removeAttribute('clip-path'));
          return resolve();
        }
        const t = Math.min(1, (now - start) / dur);
        const newW = 1280 * (1 - t);
        cpRect.setAttribute('width', newW);
        positionHandAtSvgPoint(newW, 360);
        if (t < 1) requestAnimationFrame(frame);
        else {
          drawHand.classList.remove('visible');
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }
}

function animateCamera(cam, totalMs, abort) {
  return new Promise(resolve => {
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const start = performance.now();
    // Snap to start position immediately
    viewX = cam.start.x; viewY = cam.start.y; viewW = cam.start.w; viewH = cam.start.h;
    updateViewBox();
    function frame(now) {
      if (abort.stop) return resolve();
      const t = Math.min(1, (now - start) / totalMs);
      const e = easeInOut(t);
      viewX = cam.start.x + (cam.end.x - cam.start.x) * e;
      viewY = cam.start.y + (cam.end.y - cam.start.y) * e;
      viewW = cam.start.w + (cam.end.w - cam.start.w) * e;
      viewH = cam.start.h + (cam.end.h - cam.start.h) * e;
      updateViewBox();
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// ===== Hand positioning helper =====
function positionHandAtSvgPoint(x, y) {
  const ctm = board.getScreenCTM();
  if (!ctm) return;
  const screenX = x * ctm.a + y * ctm.c + ctm.e;
  const screenY = x * ctm.b + y * ctm.d + ctm.f;
  const r = canvasFrame.getBoundingClientRect();
  const tipX = currentHandTipFrac.x * drawHand.offsetWidth;
  const tipY = currentHandTipFrac.y * drawHand.offsetHeight;
  drawHand.style.left = (screenX - r.left - tipX) + 'px';
  drawHand.style.top  = (screenY - r.top - tipY) + 'px';
}

// ===== Universal motion effects =====
function applyMotionEffect(el, effect, duration) {
  el.style.transformBox = 'fill-box';
  el.style.transformOrigin = 'center';
  const dur = duration * 1000;
  let kf, opts = { duration: dur, fill: 'forwards' };
  switch (effect) {
    case 'fade':
      kf = [{ opacity: 0 }, { opacity: 1 }];
      break;
    case 'pop':
      kf = [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1.2)', opacity: 1, offset: 0.6 },
        { transform: 'scale(0.95)', offset: 0.8 },
        { transform: 'scale(1)', opacity: 1 }
      ];
      opts.easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      break;
    case 'zoom':
      kf = [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }];
      opts.easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      break;
    case 'spin':
      kf = [
        { transform: 'rotate(-540deg) scale(0)', opacity: 0 },
        { transform: 'rotate(0deg) scale(1)', opacity: 1 }
      ];
      opts.easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      break;
    case 'shake':
      kf = [
        { transform: 'translate(0,0)', opacity: 0 },
        { transform: 'translate(-40px,0)', offset: 0.1, opacity: 1 },
        { transform: 'translate(40px,0)', offset: 0.2 },
        { transform: 'translate(-30px,0)', offset: 0.3 },
        { transform: 'translate(30px,0)', offset: 0.45 },
        { transform: 'translate(-15px,0)', offset: 0.6 },
        { transform: 'translate(15px,0)', offset: 0.75 },
        { transform: 'translate(-5px,0)', offset: 0.9 },
        { transform: 'translate(0,0)', opacity: 1 }
      ];
      break;
    case 'bounce':
      kf = [
        { transform: 'translate(0,-500px)', opacity: 0 },
        { transform: 'translate(0,0)', offset: 0.5, opacity: 1 },
        { transform: 'translate(0,-80px)', offset: 0.65 },
        { transform: 'translate(0,0)', offset: 0.78 },
        { transform: 'translate(0,-30px)', offset: 0.88 },
        { transform: 'translate(0,0)', opacity: 1 }
      ];
      opts.easing = 'cubic-bezier(0.5, 0, 0.5, 1)';
      break;
    case 'slide-r':
      kf = [{ transform: 'translate(900px,0)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1 }];
      opts.easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
      break;
    case 'slide-l':
      kf = [{ transform: 'translate(-900px,0)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1 }];
      opts.easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
      break;
    case 'slide-u':
      kf = [{ transform: 'translate(0,-600px)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1 }];
      opts.easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
      break;
    case 'slide-d':
      kf = [{ transform: 'translate(0,600px)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1 }];
      opts.easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
      break;
    case 'flip-x':
      kf = [
        { transform: 'rotateY(90deg) scale(0.6)', opacity: 0 },
        { transform: 'rotateY(0deg) scale(1)', opacity: 1 }
      ];
      opts.easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
      break;
    case 'flip-y':
      kf = [
        { transform: 'rotateX(90deg) scale(0.6)', opacity: 0 },
        { transform: 'rotateX(0deg) scale(1)', opacity: 1 }
      ];
      opts.easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
      break;
    default:
      return null;
  }
  el.animate(kf, opts);
  return true;
}

// ===== Icon animation =====
function animateIcon(it, sc, abort) {
  return new Promise(resolve => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', getIconTransform(it));
    const inner = document.createElementNS(SVG_NS, 'g');
    inner.innerHTML = it.svg;
    applyStrokeStyle(inner, it);
    const shapes = [...inner.querySelectorAll('path, circle, rect, line, polyline, polygon')];
    g.appendChild(inner);
    board.appendChild(g);

    const effect = effectFor(it, sc);
    if (effect !== 'draw' && applyMotionEffect(inner, effect, sc.duration)) {
      setTimeout(resolve, sc.duration * 1000);
      return;
    }

    // Hand-drawn effect
    const lengths = shapes.map(p => { try { return p.getTotalLength(); } catch { return 0; } });
    shapes.forEach((p, i) => {
      const L = lengths[i];
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
    });
    drawHand.classList.add('visible');
    const totalLen = lengths.reduce((a, b) => a + b, 0) || 1;
    const start = performance.now();
    const dur = sc.duration * 1000;
    function frame(now) {
      if (abort.stop) { drawHand.classList.remove('visible'); return resolve(); }
      const t = Math.min(1, (now - start) / dur);
      const target = totalLen * t;
      let acc = 0, currentShape = null, localProg = 0;
      for (let i = 0; i < shapes.length; i++) {
        if (acc + lengths[i] >= target) {
          currentShape = shapes[i];
          localProg = target - acc;
          shapes[i].style.strokeDashoffset = lengths[i] - localProg;
          break;
        } else { shapes[i].style.strokeDashoffset = 0; acc += lengths[i]; }
      }
      if (currentShape) {
        try {
          const pt = currentShape.getPointAtLength(localProg);
          const ctm = currentShape.getScreenCTM();
          if (ctm) {
            const screenX = pt.x * ctm.a + pt.y * ctm.c + ctm.e;
            const screenY = pt.x * ctm.b + pt.y * ctm.d + ctm.f;
            const fr = canvasFrame.getBoundingClientRect();
            const tipX = currentHandTipFrac.x * drawHand.offsetWidth;
            const tipY = currentHandTipFrac.y * drawHand.offsetHeight;
            drawHand.style.left = (screenX - fr.left - tipX) + 'px';
            drawHand.style.top  = (screenY - fr.top - tipY) + 'px';
          }
        } catch {}
      }
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// Effective effect for an item: per-item override > scene default
function effectFor(it, sc) { return it.effect || sc.effect; }

// =========== FONT LOADING (for hand-drawn text via opentype.js) ===========
const FONT_URLS = {
  'Cairo':       'https://cdn.jsdelivr.net/gh/Gue3bara/Cairo@master/fonts/ttf/Cairo-Regular.ttf',
  'Tajawal':     'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Regular.ttf',
  'Amiri':       'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf',
  'Almarai':     'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/almarai/Almarai-Regular.ttf',
  'Lalezar':     'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lalezar/Lalezar-Regular.ttf',
  'Reem Kufi':   'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/reemkufi/ReemKufi-Regular.ttf',
  'Aref Ruqaa':  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/arefruqaa/ArefRuqaa-Regular.ttf',
  'El Messiri':  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/elmessiri/ElMessiri-Regular.ttf'
};
const fontCache = new Map();   // family → opentype.Font  (or null = failed)
const fontPromises = new Map(); // family → Promise<font|null>

function loadFontForPath(family) {
  if (fontCache.has(family)) return Promise.resolve(fontCache.get(family));
  if (fontPromises.has(family)) return fontPromises.get(family);
  const url = FONT_URLS[family];
  if (!url || !window.opentype) { fontCache.set(family, null); return Promise.resolve(null); }
  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = await res.arrayBuffer();
      const font = opentype.parse(buf);
      fontCache.set(family, font);
      return font;
    } catch (e) {
      console.warn('[font] load failed for', family, e);
      fontCache.set(family, null);
      return null;
    }
  })();
  fontPromises.set(family, p);
  return p;
}

// Build SVG path data for a multi-line text using opentype.js
function buildTextPathData(it, font) {
  const lines = String(it.text || '').split('\n');
  const lh = it.lineHeight || 1.2;
  let combined = '';
  let baseY = it.y;
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) baseY += it.fontSize * lh;
    const line = lines[i];
    if (!line) continue;
    // text-anchor adjustment: middle/end shift x
    let xPos = it.x;
    if (it.align === 'middle' || it.align === 'end') {
      try {
        const w = font.getAdvanceWidth(line, it.fontSize);
        if (it.align === 'middle') xPos -= w / 2;
        else xPos -= w;
      } catch {}
    }
    try {
      const path = font.getPath(line, xPos, baseY, it.fontSize);
      combined += path.toPathData(2) + ' ';
    } catch (e) { /* skip line on failure */ }
  }
  return combined.trim();
}

// ===== Text animation =====
async function animateText(it, sc, abort) {
  return new Promise(async (resolve) => {
    const effect = effectFor(it, sc);
    const wrap = document.createElementNS(SVG_NS, 'g');
    const tr = getTextTransform(it); if (tr) wrap.setAttribute('transform', tr);
    const t = buildTextElement(it, it.text);
    wrap.appendChild(t);
    board.appendChild(wrap);
    const bbox = t.getBBox();

    if (effect !== 'draw') {
      if (!applyMotionEffect(wrap, effect, sc.duration)) {
        applyMotionEffect(wrap, 'pop', sc.duration);
      }
      setTimeout(resolve, sc.duration * 1000);
      return;
    }

    // Try the proper "trace each letter shape" hand-drawing using opentype.js paths
    if (window.opentype) {
      const font = await loadFontForPath(it.fontFamily || 'Cairo');
      if (font && !abort.stop) {
        const pathD = buildTextPathData(it, font);
        if (pathD) {
          // Replace rendered text with a stroked path; animate stroke-dashoffset.
          // Hand follows the stroke head via getPointAtLength.
          const pathEl = document.createElementNS(SVG_NS, 'path');
          pathEl.setAttribute('d', pathD);
          pathEl.setAttribute('fill', 'none');
          pathEl.setAttribute('stroke', it.color);
          pathEl.setAttribute('stroke-width', Math.max(1.5, it.fontSize * 0.045));
          pathEl.setAttribute('stroke-linecap', 'round');
          pathEl.setAttribute('stroke-linejoin', 'round');
          wrap.replaceChildren(pathEl);
          let totalLen = 0;
          try { totalLen = pathEl.getTotalLength(); } catch {}
          if (totalLen > 0) {
            pathEl.style.strokeDasharray = totalLen;
            pathEl.style.strokeDashoffset = totalLen;
            drawHand.classList.add('visible');
            const start = performance.now();
            const dur = sc.duration * 1000;
            function frame(now) {
              if (abort.stop) return resolve();
              const t01 = Math.min(1, (now - start) / dur);
              const target = totalLen * t01;
              pathEl.style.strokeDashoffset = totalLen - target;
              try {
                const pt = pathEl.getPointAtLength(target);
                positionHandAtSvgPoint(pt.x, pt.y);
              } catch {}
              if (t01 < 1) requestAnimationFrame(frame);
              else {
                // Fill the text once finished — looks crisper than a thin stroke
                pathEl.setAttribute('fill', it.color);
                pathEl.style.strokeDasharray = '';
                pathEl.style.strokeDashoffset = '';
                pathEl.setAttribute('stroke', 'none');
                resolve();
              }
            }
            requestAnimationFrame(frame);
            return;
          }
        }
      }
    }
    // === Fallback: clip-path wipe (if opentype/font unavailable) ===

    // Wipe reveal via clipPath — character-by-character when possible
    let defs = board.querySelector('defs');
    if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); board.appendChild(defs); }
    const clipId = 'clip-' + it.id + '-' + Date.now();
    const clip = document.createElementNS(SVG_NS, 'clipPath');
    clip.setAttribute('id', clipId);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('y', bbox.y);
    rect.setAttribute('height', bbox.height);
    rect.setAttribute('x', it.isRTL ? bbox.x + bbox.width : bbox.x);
    rect.setAttribute('width', 0);
    clip.appendChild(rect);
    defs.appendChild(clip);
    t.setAttribute('clip-path', `url(#${clipId})`);

    // Try to extract per-character flow positions (more reliable than extents for RTL/ligatures).
    // We collect: startX (where the first char begins) + endX after each char (where pen finishes that char).
    const isSingleLine = !String(it.text || '').includes('\n');
    let charPositions = null;
    if (isSingleLine && t.getNumberOfChars && t.getStartPositionOfChar && t.getEndPositionOfChar) {
      try {
        const N = t.getNumberOfChars();
        if (N > 0) {
          let startX = null;
          try { startX = t.getStartPositionOfChar(0).x; } catch {}
          const ends = [];
          for (let i = 0; i < N; i++) {
            let x = null;
            try { x = t.getEndPositionOfChar(i).x; } catch {}
            // Fall back: if this char failed, reuse the previous successful end (zero-width)
            if (x == null) x = (ends.length ? ends[ends.length - 1] : startX);
            ends.push(x);
          }
          if (startX == null && ends.length) startX = ends[0];
          if (startX != null && ends.length) {
            // Drop consecutive duplicates that didn't advance — they cause stalls
            const cleaned = [];
            ends.forEach(x => {
              const last = cleaned.length ? cleaned[cleaned.length - 1] : startX;
              if (Math.abs(x - last) > 0.1) cleaned.push(x);
            });
            if (cleaned.length) charPositions = { startX, ends: cleaned };
          }
        }
      } catch {}
    }

    drawHand.classList.add('visible');
    const start = performance.now();
    const dur = sc.duration * 1000;
    const handY = bbox.y + bbox.height * 0.7;

    if (charPositions) {
      const { startX, ends } = charPositions;
      const N = ends.length;
      const goingLeft = ends[N - 1] < startX;
      // Each char: 75% drawing + 25% pause → makes the per-character motion clearly visible
      const DRAW_FRAC = 0.75;

      function frame(now) {
        if (abort.stop) { drawHand.classList.remove('visible'); return resolve(); }
        const t01 = Math.min(1, (now - start) / dur);
        const charPos = t01 * N;
        const fullIdx = Math.min(N - 1, Math.floor(charPos));
        const localFrac = Math.min(1, charPos - fullIdx);
        const drawProgress = Math.min(1, localFrac / DRAW_FRAC); // pauses at 1 during last 25%
        const prevX = fullIdx === 0 ? startX : ends[fullIdx - 1];
        const nextX = ends[fullIdx];
        const edge = prevX + (nextX - prevX) * drawProgress;

        if (goingLeft) {
          rect.setAttribute('x', edge);
          rect.setAttribute('width', Math.max(0, startX - edge));
        } else {
          rect.setAttribute('x', startX);
          rect.setAttribute('width', Math.max(0, edge - startX));
        }
        positionHandAtSvgPoint(edge, handY);
        if (t01 < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    } else {
      // Fallback: bbox-wide single wipe
      function frame(now) {
        if (abort.stop) { drawHand.classList.remove('visible'); return resolve(); }
        const t01 = Math.min(1, (now - start) / dur);
        const w = bbox.width * t01;
        let handX;
        if (it.isRTL) {
          rect.setAttribute('x', bbox.x + bbox.width - w);
          rect.setAttribute('width', w);
          handX = bbox.x + bbox.width - w;
        } else {
          rect.setAttribute('width', w);
          handX = bbox.x + w;
        }
        positionHandAtSvgPoint(handX, handY);
        if (t01 < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    }
  });
}

// ===== Counter animation — count from `from` to `to` =====
function animateCounter(it, sc, abort) {
  return new Promise(resolve => {
    const effect = effectFor(it, sc);
    const wrap = document.createElementNS(SVG_NS, 'g');
    const tr = getTextTransform(it); if (tr) wrap.setAttribute('transform', tr);
    const t = buildTextElement(it, formatCounter(it, it.from));
    wrap.appendChild(t);
    board.appendChild(wrap);

    if (effect !== 'draw') {
      applyMotionEffect(wrap, effect, sc.duration) ||
        applyMotionEffect(wrap, 'pop', sc.duration);
    }

    const start = performance.now();
    const dur = sc.duration * 1000;
    const easeOut = (p) => 1 - Math.pow(1 - p, 3);
    let currentNode = t;
    function frame(now) {
      if (abort.stop) return resolve();
      const p = Math.min(1, (now - start) / dur);
      const v = it.from + (it.to - it.from) * easeOut(p);
      const fresh = buildTextElement(it, formatCounter(it, v));
      wrap.replaceChild(fresh, currentNode);
      currentNode = fresh;
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// ===== Image animation (clip-path wipe) =====
function animateImage(it, sc, abort) {
  return new Promise(resolve => {
    const wrap = document.createElementNS(SVG_NS, 'g');
    const tr = getImageTransform(it); if (tr) wrap.setAttribute('transform', tr);
    const img = document.createElementNS(SVG_NS, 'image');
    img.setAttribute('x', it.x); img.setAttribute('y', it.y);
    img.setAttribute('width', it.width); img.setAttribute('height', it.height);
    img.setAttribute('href', it.src);
    img.setAttribute('preserveAspectRatio', 'none');
    wrap.appendChild(img);
    board.appendChild(wrap);

    const effect = effectFor(it, sc);
    if (effect !== 'draw' && applyMotionEffect(wrap, effect, sc.duration)) {
      setTimeout(resolve, sc.duration * 1000);
      return;
    }

    // Draw effect: wipe reveal via clipPath
    let defs = board.querySelector('defs');
    if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); board.appendChild(defs); }
    const clipId = 'clip-img-' + it.id + '-' + Date.now();
    const clip = document.createElementNS(SVG_NS, 'clipPath');
    clip.setAttribute('id', clipId);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', it.x); rect.setAttribute('y', it.y);
    rect.setAttribute('height', it.height); rect.setAttribute('width', 0);
    clip.appendChild(rect);
    defs.appendChild(clip);
    img.setAttribute('clip-path', `url(#${clipId})`);

    drawHand.classList.add('visible');
    const start = performance.now();
    const dur = sc.duration * 1000;
    function frame(now) {
      if (abort.stop) { drawHand.classList.remove('visible'); return resolve(); }
      const t = Math.min(1, (now - start) / dur);
      const w = it.width * t;
      rect.setAttribute('width', w);
      positionHandAtSvgPoint(it.x + w, it.y + it.height * 0.5);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// =========== AUDIO RECORDING + EDITING ===========
let audioRecorder = null, audioChunks = [], audioRecStart = 0, audioRecTimer = null;
let audioFullDuration = 0;
const recTimerEl = document.getElementById('rec-timer');
const audioEditPanel = document.getElementById('audio-edit');
const ctrlSpeed = document.getElementById('ctrl-speed');
const ctrlTrimStart = document.getElementById('ctrl-trim-start');
const ctrlTrimEnd = document.getElementById('ctrl-trim-end');
const lblSpeed = document.getElementById('lbl-speed');
const lblTrimS = document.getElementById('lbl-trim-s');
const lblTrimE = document.getElementById('lbl-trim-e');

document.getElementById('btn-rec-start').onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    audioRecorder = new MediaRecorder(stream);
    audioRecorder.ondataavailable = e => e.data.size && audioChunks.push(e.data);
    audioRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: audioRecorder.mimeType || 'audio/webm' });
      bgAudio.src = URL.createObjectURL(blob);
      bgAudio.style.display = 'block';
      bgAudio.onloadedmetadata = () => setupAudioEdit(bgAudio.duration);
      try {
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
        const { url } = await WB_API.Uploads.file(file);
        bgAudio.dataset.serverUrl = url;
        flashStatus('✓ تم رفع التسجيل');
      } catch (err) { console.warn('Upload failed', err); }
    };
    audioRecorder.start();
    audioRecStart = Date.now();
    recTimerEl.textContent = '⏺ 00:00';
    audioRecTimer = setInterval(() => {
      const s = Math.floor((Date.now() - audioRecStart) / 1000);
      recTimerEl.textContent = `⏺ ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }, 200);
    document.getElementById('btn-rec-start').disabled = true;
    document.getElementById('btn-rec-stop').disabled = false;
  } catch (err) {
    alert('لم يتم السماح باستخدام الميكروفون: ' + err.message);
  }
};
document.getElementById('btn-rec-stop').onclick = () => {
  if (audioRecorder && audioRecorder.state === 'recording') audioRecorder.stop();
  clearInterval(audioRecTimer); recTimerEl.textContent = '✓ تم التسجيل';
  document.getElementById('btn-rec-start').disabled = false;
  document.getElementById('btn-rec-stop').disabled = true;
};

function setupAudioEdit(duration) {
  if (!isFinite(duration) || duration <= 0) return;
  audioFullDuration = duration;
  audioEditPanel.style.display = 'block';
  ctrlTrimStart.max = duration; ctrlTrimEnd.max = duration;
  ctrlTrimStart.value = 0; ctrlTrimEnd.value = duration;
  lblTrimS.textContent = '0.0s'; lblTrimE.textContent = duration.toFixed(1) + 's';
  ctrlSpeed.value = 1; lblSpeed.textContent = '1.0x';
  bgAudio.playbackRate = 1;
}

bgAudio.addEventListener('loadedmetadata', () => {
  if (isFinite(bgAudio.duration)) setupAudioEdit(bgAudio.duration);
});

ctrlSpeed.oninput = () => {
  const v = parseFloat(ctrlSpeed.value);
  bgAudio.playbackRate = v;
  lblSpeed.textContent = v.toFixed(1) + 'x';
};
ctrlTrimStart.oninput = () => {
  let s = parseFloat(ctrlTrimStart.value), e = parseFloat(ctrlTrimEnd.value);
  if (s >= e) { s = e - 0.1; ctrlTrimStart.value = s; }
  lblTrimS.textContent = s.toFixed(1) + 's';
};
ctrlTrimEnd.oninput = () => {
  let s = parseFloat(ctrlTrimStart.value), e = parseFloat(ctrlTrimEnd.value);
  if (e <= s) { e = s + 0.1; ctrlTrimEnd.value = e; }
  lblTrimE.textContent = e.toFixed(1) + 's';
};

// Enforce trim during playback
bgAudio.addEventListener('timeupdate', () => {
  const e = parseFloat(ctrlTrimEnd.value || 0);
  const s = parseFloat(ctrlTrimStart.value || 0);
  if (e && bgAudio.currentTime >= e) { bgAudio.pause(); bgAudio.currentTime = s; }
});
bgAudio.addEventListener('play', () => {
  const s = parseFloat(ctrlTrimStart.value || 0);
  if (bgAudio.currentTime < s) bgAudio.currentTime = s;
});

document.getElementById('btn-audio-preview').onclick = () => {
  const s = parseFloat(ctrlTrimStart.value || 0);
  bgAudio.currentTime = s; bgAudio.play();
};

// =========== EXPORT VIDEO (WebM) ===========
const exportOverlay = document.getElementById('export-overlay');
const exportProgress = document.getElementById('export-progress');
const exportCanvas = document.getElementById('export-canvas');

document.getElementById('btn-export').onclick = exportVideo;

async function exportVideo() {
  if (isPlaying) return alert('أوقفى التشغيل أولاً');
  if (!('MediaRecorder' in window)) return alert('متصفحك لا يدعم MediaRecorder');
  const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
  if (totalDuration === 0) return alert('لا يوجد محتوى للتصدير');

  exportOverlay.classList.add('show');
  exportProgress.textContent = '0%';

  const ctx = exportCanvas.getContext('2d');
  const stream = exportCanvas.captureStream(30);

  // Mix audio if available
  if (bgAudio.src) {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(bgAudio);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest); source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    } catch (e) { console.warn('Audio mixing failed', e); }
  }

  const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data);

  // Mirror SVG to canvas continuously
  let mirrorStop = false;
  let lastImg = null;
  const mirrorLoop = () => {
    if (mirrorStop) return;
    serializeAndDraw(board, exportCanvas, ctx).finally(() => {
      if (!mirrorStop) requestAnimationFrame(mirrorLoop);
    });
  };

  // Progress tracker
  const playStart = performance.now();
  const progressTimer = setInterval(() => {
    const elapsed = (performance.now() - playStart) / 1000;
    const pct = Math.min(100, (elapsed / totalDuration) * 100);
    exportProgress.textContent = pct.toFixed(0) + '%';
  }, 200);

  recorder.start();
  mirrorLoop();

  try {
    await runPlayback();
  } finally {
    clearInterval(progressTimer);
    await sleep(400);   // capture last frames
    mirrorStop = true;
    recorder.stop();
    await new Promise(r => recorder.onstop = r);
    const blob = new Blob(chunks, { type: 'video/webm' });
    downloadBlob(blob, `whiteboard-${Date.now()}.webm`);
    exportOverlay.classList.remove('show');
  }
}

function serializeAndDraw(svg, canvas, ctx) {
  return new Promise(resolve => {
    const xml = new XMLSerializer().serializeToString(svg);
    // ensure xmlns
    const xmlFixed = xml.includes('xmlns=') ? xml : xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const blob = new Blob([xmlFixed], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // overlay hand image at its current position
      try {
        const handVisible = drawHand.classList.contains('visible');
        if (handVisible) {
          const handRect = drawHand.getBoundingClientRect();
          const frameRect = canvasFrame.getBoundingClientRect();
          const sx = (handRect.left - frameRect.left) / frameRect.width * canvas.width;
          const sy = (handRect.top - frameRect.top) / frameRect.height * canvas.height;
          const sw = handRect.width / frameRect.width * canvas.width;
          const sh = handRect.height / frameRect.height * canvas.height;
          const handImg = new Image();
          handImg.onload = () => {
            ctx.drawImage(handImg, sx, sy, sw, sh);
            URL.revokeObjectURL(url);
            resolve();
          };
          handImg.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          handImg.src = drawHand.src;
        } else {
          URL.revokeObjectURL(url);
          resolve();
        }
      } catch {
        URL.revokeObjectURL(url);
        resolve();
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}

// =========== UTILS ===========
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =========== AUTH FLOW ===========
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');
const authSubtitle = document.getElementById('auth-subtitle');
const userChip = document.getElementById('user-chip');
const userEmailEl = document.getElementById('user-email');

let authMode = 'login';
document.querySelectorAll('.auth-tabs .tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.auth-tabs .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    authMode = t.dataset.tab;
    authNameInput.style.display = authMode === 'register' ? 'block' : 'none';
    authSubmit.textContent = authMode === 'register' ? 'إنشاء حساب' : 'دخول';
    authSubtitle.textContent = authMode === 'register' ? 'أنشئ حساب جديد' : 'سجّل دخولك للبدء';
    authError.classList.remove('show');
  };
});

authForm.onsubmit = async (e) => {
  e.preventDefault();
  authError.classList.remove('show');
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const name = authNameInput.value.trim();
  authSubmit.disabled = true;
  try {
    let user;
    if (authMode === 'register') user = await WB_API.Auth.register(email, password, name);
    else user = await WB_API.Auth.login(email, password);
    onLoginSuccess(user);
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.add('show');
  } finally { authSubmit.disabled = false; }
};

document.getElementById('btn-logout').onclick = () => {
  if (!confirm('تسجيل الخروج؟')) return;
  WB_API.Auth.logout();
  location.reload();
};

function onLoginSuccess(user) {
  authModal.classList.remove('show');
  userChip.style.display = 'inline-flex';
  userEmailEl.textContent = user.name || user.email;
  initStudio();
}

function initStudio() {
  setHandStyle(projectHandStyle);
  renderCategories();
  renderLibrary();
  renderScenes();
  renderCanvas();
  syncProps();
  setSaveStatus('idle');
  // Auto-save on project name edits
  const pn = document.getElementById('project-name');
  if (pn && !pn.dataset.bound) {
    pn.dataset.bound = '1';
    pn.addEventListener('input', () => scheduleAutoSave());
  }
}

(async function bootstrap() {
  const user = await WB_API.Auth.me();
  if (user) onLoginSuccess(user);
  else authModal.classList.add('show');
})();

console.log('%cWhiteBoard Studio v3 (client/server)', 'color:#ffb547;font-size:18px;font-weight:bold');
