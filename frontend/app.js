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
  { id: 1, name: 'مشهد 1', items: [], duration: 3, effect: 'draw', color: '#222', stroke: 2.5 }
];
let currentSceneId = 1;
let nextItemId = 1;
let nextSceneId = 2;
let isPlaying = false;
let playAbort = null;
let selectedItemId = null;

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
  const sc = currentScene();
  const newItem = {
    id: nextItemId++, type: 'icon', svg: innerSvg,
    x: 200 + Math.random() * 400, y: 150 + Math.random() * 300,
    scale: 0.6, rotation: 0, flipX: false, flipY: false,
    color: sc.color, stroke: sc.stroke
  };
  sc.items.push(newItem);
  selectedItemId = newItem.id;
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
  selectedItemId = newItem.id;
  renderCanvas(); renderScenes(); syncItemControls();
}

function addTextToScene(text, isRTL) {
  const sc = currentScene();
  const newItem = {
    id: nextItemId++, type: 'text', text,
    x: 200, y: 360, fontSize: 80,
    rotation: 0, flipX: false, flipY: false,
    color: sc.color, isRTL: isRTL ?? /[؀-ۿ]/.test(text)
  };
  sc.items.push(newItem);
  selectedItemId = newItem.id;
  renderCanvas(); renderScenes(); syncItemControls();
}

// =========== STATIC RENDER ===========
function renderCanvas() {
  const sc = currentScene();
  board.innerHTML = '';
  sc.items.forEach(it => {
    if (it.type === 'text') renderTextItem(it);
    else if (it.type === 'image') renderImageItem(it);
    else renderIconItem(it);
  });
  drawSelectionHandles();
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
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', it.x);
  t.setAttribute('y', it.y);
  t.setAttribute('font-size', it.fontSize);
  t.setAttribute('font-family', 'Cairo, sans-serif');
  t.setAttribute('fill', it.color);
  t.setAttribute('font-weight', '700');
  if (it.isRTL) t.setAttribute('direction', 'rtl');
  const tr = getTextTransform(it);
  if (tr) t.setAttribute('transform', tr);
  t.textContent = it.text;
  t.dataset.id = it.id;
  enableDrag(t, it);
  board.appendChild(t);
}

function drawSelectionHandles() {
  const old = board.querySelector('#handles-group');
  if (old) old.remove();
  if (!selectedItemId || isPlaying) return;
  const it = getSelectedItem();
  if (!it) return;
  const el = board.querySelector(`[data-id="${selectedItemId}"]`);
  if (!el) return;
  // Use rendered bounding rect (in screen pixels) — includes strokes, handles all transforms.
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

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', 'handles-group');

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

    function onMove(ev) {
      const pt = svgPoint(ev);
      const newDist = Math.hypot(pt.x - anchorCx, pt.y - anchorCy);
      const ratio = Math.max(0.02, newDist / startDist);
      if (it.type === 'image') {
        it.width = Math.max(20, startW * ratio);
        it.height = Math.max(20, startH * ratio);
      } else if (it.type === 'icon') {
        it.scale = Math.max(0.05, Math.min(8, startScale * ratio));
      } else if (it.type === 'text') {
        it.fontSize = Math.max(12, Math.min(600, startFS * ratio));
      }
      updateItemRender(it);
      // Keep visual center fixed on the original anchor
      const c = getItemVisualCenter(it);
      if (c) { it.x += anchorCx - c.x; it.y += anchorCy - c.y; updateItemRender(it); }
      drawSelectionHandles();
      syncItemControls();
    }
    function onUp() {
      document.body.classList.remove('dragging');
      document.removeEventListener('selectstart', blockSelect);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
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

    function onMove(ev) {
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
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function applyStrokeStyle(g, it) {
  g.querySelectorAll('path, circle, rect, line, polyline, polygon').forEach(p => {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', it.color);
    p.setAttribute('stroke-width', it.stroke * 8);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
  });
}

// =========== DRAG + SELECT ===========
function enableDrag(el, it) {
  let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
  el.style.cursor = 'move';
  el.addEventListener('pointerdown', (e) => {
    if (isPlaying) return;
    if (spaceHeld || e.button === 1) return;
    e.stopPropagation();
    dragging = true; moved = false;
    el.setPointerCapture(e.pointerId);
    const pt = svgPoint(e); sx = pt.x; sy = pt.y; ox = it.x; oy = it.y;
    selectItem(it.id);
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const pt = svgPoint(e);
    const dx = pt.x - sx, dy = pt.y - sy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    it.x = ox + dx; it.y = oy + dy;
    updateItemRender(it, el);
    drawSelectionHandles();
  });
  el.addEventListener('pointerup', () => { dragging = false; });
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
    drawSelectionOutline();
    syncItemControls();
  }, { passive: false });
}

// Click empty canvas → deselect
board.addEventListener('pointerdown', (e) => {
  if (e.target === board) { selectedItemId = null; syncItemControls(); drawSelectionHandles(); }
});

function selectItem(id) {
  selectedItemId = id;
  syncItemControls();
  drawSelectionHandles();
}

// Lightweight in-place update (avoid full re-render during drag)
function updateItemRender(it, el) {
  if (!el) el = board.querySelector(`[data-id="${it.id}"]`);
  if (!el) return;
  if (it.type === 'icon') {
    el.setAttribute('transform', getIconTransform(it));
  } else if (it.type === 'text') {
    el.setAttribute('x', it.x); el.setAttribute('y', it.y);
    el.setAttribute('font-size', it.fontSize);
    const tr = getTextTransform(it);
    if (tr) el.setAttribute('transform', tr); else el.removeAttribute('transform');
  } else if (it.type === 'image') {
    el.setAttribute('x', it.x); el.setAttribute('y', it.y);
    el.setAttribute('width', it.width); el.setAttribute('height', it.height);
    const tr = getImageTransform(it);
    if (tr) el.setAttribute('transform', tr); else el.removeAttribute('transform');
  }
}
function deleteItem(id) {
  const sc = currentScene();
  sc.items = sc.items.filter(x => x.id !== id);
  if (selectedItemId === id) selectedItemId = null;
  renderCanvas(); renderScenes(); syncItemControls();
}
function svgPoint(evt) {
  const pt = board.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(board.getScreenCTM().inverse());
}

// =========== SCENES UI ===========
function renderScenes() {
  scenesList.innerHTML = '';
  track.innerHTML = '';
  scenes.forEach(s => {
    const li = document.createElement('li');
    li.className = s.id === currentSceneId ? 'active' : '';
    li.innerHTML = `<span>${s.name} • ${s.duration}s • ${s.items.length} عنصر</span><span class="del" title="حذف">✕</span>`;
    li.onclick = (e) => {
      if (e.target.classList.contains('del')) {
        if (scenes.length === 1) return alert('لا يمكن حذف آخر مشهد');
        scenes = scenes.filter(x => x.id !== s.id);
        if (currentSceneId === s.id) currentSceneId = scenes[0].id;
        renderScenes(); renderCanvas(); syncProps();
      } else {
        currentSceneId = s.id;
        renderScenes(); renderCanvas(); syncProps();
      }
    };
    scenesList.appendChild(li);

    const block = document.createElement('div');
    block.className = 'track-block' + (s.id === currentSceneId ? ' active' : '');
    block.style.minWidth = (60 + s.duration * 30) + 'px';
    block.textContent = `${s.name} (${s.duration}s)`;
    block.onclick = () => { currentSceneId = s.id; renderScenes(); renderCanvas(); syncProps(); };
    track.appendChild(block);
  });
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  timecode.textContent = `00:00 / ${formatTime(total)}`;
}
function formatTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// =========== PROPS ===========
function syncProps() {
  const s = currentScene();
  propDuration.value = s.duration;
  propEffect.value = s.effect;
  propColor.value = s.color;
  propStroke.value = s.stroke;
}
propDuration.oninput = () => { currentScene().duration = parseFloat(propDuration.value) || 1; renderScenes(); };
propEffect.oninput  = () => { currentScene().effect = propEffect.value; };
propColor.oninput   = () => {
  const s = currentScene(); s.color = propColor.value;
  s.items.forEach(it => it.color = s.color); renderCanvas();
};
propStroke.oninput  = () => {
  const s = currentScene(); s.stroke = parseFloat(propStroke.value);
  s.items.forEach(it => { if (it.type !== 'text') it.stroke = s.stroke; }); renderCanvas();
};

// =========== ITEM CONTROLS PANEL ===========
const itemControls = document.getElementById('item-controls');
const ctrlScale = document.getElementById('ctrl-scale');
const ctrlRot = document.getElementById('ctrl-rot');
const lblScale = document.getElementById('lbl-scale');
const lblRot = document.getElementById('lbl-rot');

function getSelectedItem() {
  if (!selectedItemId) return null;
  return currentScene().items.find(it => it.id === selectedItemId) || null;
}

function syncItemControls() {
  const it = getSelectedItem();
  if (!it) {
    itemControls.style.display = 'none';
    if (selectedItemId) selectedItemId = null;
    return;
  }
  itemControls.style.display = 'block';
  if (it.type === 'icon') {
    ctrlScale.min = 10; ctrlScale.max = 300;
    ctrlScale.value = Math.round(it.scale * 100);
    lblScale.textContent = Math.round(it.scale * 100) + '%';
  } else if (it.type === 'text') {
    ctrlScale.min = 12; ctrlScale.max = 400;
    ctrlScale.value = Math.round(it.fontSize);
    lblScale.textContent = it.fontSize + 'px';
  } else if (it.type === 'image') {
    ctrlScale.min = 30; ctrlScale.max = 1500;
    ctrlScale.value = Math.round(it.width);
    lblScale.textContent = Math.round(it.width) + 'px';
  }
  ctrlRot.value = it.rotation || 0;
  lblRot.textContent = (it.rotation || 0) + '°';
}

ctrlScale.oninput = () => {
  const it = getSelectedItem(); if (!it) return;
  const v = parseInt(ctrlScale.value);
  if (it.type === 'icon') { it.scale = v / 100; lblScale.textContent = v + '%'; }
  else if (it.type === 'text') { it.fontSize = v; lblScale.textContent = v + 'px'; }
  else if (it.type === 'image') {
    const ratio = v / it.width;
    it.width = v; it.height = it.height * ratio;
    lblScale.textContent = v + 'px';
  }
  renderCanvas();
};
ctrlRot.oninput = () => {
  const it = getSelectedItem(); if (!it) return;
  it.rotation = parseInt(ctrlRot.value);
  lblRot.textContent = it.rotation + '°';
  renderCanvas();
};
document.getElementById('ctrl-flip-x').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  it.flipX = !it.flipX; renderCanvas();
};
document.getElementById('ctrl-flip-y').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  it.flipY = !it.flipY; renderCanvas();
};
document.getElementById('ctrl-front').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  const sc = currentScene();
  const idx = sc.items.indexOf(it);
  if (idx < sc.items.length - 1) { sc.items.splice(idx, 1); sc.items.push(it); renderCanvas(); }
};
document.getElementById('ctrl-back').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  const sc = currentScene();
  const idx = sc.items.indexOf(it);
  if (idx > 0) { sc.items.splice(idx, 1); sc.items.unshift(it); renderCanvas(); }
};
document.getElementById('ctrl-reset').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  it.rotation = 0; it.flipX = false; it.flipY = false;
  if (it.type === 'icon') it.scale = 0.6; else it.fontSize = 80;
  renderCanvas(); syncItemControls();
};
document.getElementById('ctrl-delete').onclick = () => {
  const it = getSelectedItem(); if (!it) return;
  deleteItem(it.id);
};

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (isPlaying) return;
  const it = getSelectedItem(); if (!it) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteItem(it.id); }
  else if (e.key === 'r' || e.key === 'R') { it.rotation = ((it.rotation || 0) + 15) % 360; renderCanvas(); syncItemControls(); }
  else if (e.key === '+' || e.key === '=') {
    if (it.type === 'icon') it.scale = Math.min(3, it.scale * 1.1);
    else if (it.type === 'text') it.fontSize = Math.min(400, it.fontSize + 8);
    else if (it.type === 'image') { it.width *= 1.1; it.height *= 1.1; }
    renderCanvas(); syncItemControls();
  }
  else if (e.key === '-') {
    if (it.type === 'icon') it.scale = Math.max(0.05, it.scale * 0.9);
    else if (it.type === 'text') it.fontSize = Math.max(12, it.fontSize - 8);
    else if (it.type === 'image') { it.width *= 0.9; it.height *= 0.9; }
    renderCanvas(); syncItemControls();
  }
});

// =========== TOOLBAR ACTIONS ===========
document.getElementById('btn-add-scene').onclick = () => {
  const id = nextSceneId++;
  scenes.push({ id, name: `مشهد ${scenes.length + 1}`, items: [], duration: 3, effect: 'draw', color: '#222', stroke: 2.5 });
  currentSceneId = id;
  renderScenes(); renderCanvas(); syncProps();
};

document.getElementById('btn-add-text').onclick = () => {
  const text = prompt('اكتب النص:', 'مرحبا بالعالم');
  if (text && text.trim()) addTextToScene(text.trim());
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

document.getElementById('btn-save').onclick = async () => {
  const name = document.getElementById('project-name').value.trim() || 'مشروع بدون اسم';
  const data = { scenes, nextItemId, nextSceneId, audioUrl: bgAudio.dataset.serverUrl || null };
  try {
    if (currentProjectId) {
      await WB_API.Projects.update(currentProjectId, { name, data });
      flashStatus('✓ تم الحفظ');
    } else {
      const { id } = await WB_API.Projects.create(name, data);
      currentProjectId = id;
      flashStatus('✓ تم إنشاء المشروع');
    }
  } catch (e) { alert('فشل الحفظ: ' + e.message); }
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
          <h4>${escapeHtml(p.name)}</h4>
          <p>آخر تعديل: ${date}</p>
        </div>
        <div class="actions-mini">
          <button class="btn-ghost btn-sm">فتح</button>
          <button class="del-btn">🗑</button>
        </div>`;
      const [openBtn, delBtn] = card.querySelectorAll('button');
      openBtn.onclick = (e) => { e.stopPropagation(); loadProject(p.id); };
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
    scenes = p.data.scenes;
    nextItemId = p.data.nextItemId || (Math.max(0, ...scenes.flatMap(s => s.items.map(i => i.id))) + 1);
    nextSceneId = p.data.nextSceneId || (Math.max(0, ...scenes.map(s => s.id)) + 1);
    currentSceneId = scenes[0].id;
    currentProjectId = p.id;
    selectedItemId = null;
    document.getElementById('project-name').value = p.name;
    if (p.data.audioUrl) {
      bgAudio.src = p.data.audioUrl;
      bgAudio.dataset.serverUrl = p.data.audioUrl;
      bgAudio.style.display = 'block';
    } else {
      bgAudio.removeAttribute('src'); bgAudio.style.display = 'none';
      delete bgAudio.dataset.serverUrl;
    }
    renderScenes(); renderCanvas(); syncProps(); syncItemControls();
    document.getElementById('projects-modal').classList.remove('show');
    flashStatus('✓ تم فتح المشروع');
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
}

async function playScene(sc, abort) {
  board.innerHTML = '';
  for (const it of sc.items) {
    if (abort.stop) return;
    if (it.type === 'text') await animateText(it, sc, abort);
    else if (it.type === 'image') await animateImage(it, sc, abort);
    else await animateIcon(it, sc, abort);
  }
}

// ===== Hand positioning helper =====
function positionHandAtSvgPoint(x, y) {
  const ctm = board.getScreenCTM();
  if (!ctm) return;
  const screenX = x * ctm.a + y * ctm.c + ctm.e;
  const screenY = x * ctm.b + y * ctm.d + ctm.f;
  const r = canvasFrame.getBoundingClientRect();
  drawHand.style.left = (screenX - r.left - 10) + 'px';
  drawHand.style.top  = (screenY - r.top - 5) + 'px';
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
    const shapes = [...inner.querySelectorAll('path, circle, rect, line, polyline, polygon')];
    shapes.forEach(p => {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', it.color);
      p.setAttribute('stroke-width', it.stroke * 8);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    });
    g.appendChild(inner);
    board.appendChild(g);

    if (applyMotionEffect(inner, sc.effect, sc.duration)) {
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
            drawHand.style.left = (screenX - fr.left - 10) + 'px';
            drawHand.style.top  = (screenY - fr.top - 5) + 'px';
          }
        } catch {}
      }
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// ===== Text animation =====
function animateText(it, sc, abort) {
  return new Promise(resolve => {
    const wrap = document.createElementNS(SVG_NS, 'g');
    const tr = getTextTransform(it); if (tr) wrap.setAttribute('transform', tr);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', it.x);
    t.setAttribute('y', it.y);
    t.setAttribute('font-size', it.fontSize);
    t.setAttribute('font-family', 'Cairo, sans-serif');
    t.setAttribute('fill', it.color);
    t.setAttribute('font-weight', '700');
    if (it.isRTL) t.setAttribute('direction', 'rtl');
    t.textContent = it.text;
    wrap.appendChild(t);
    board.appendChild(wrap);
    const bbox = t.getBBox();

    if (sc.effect !== 'draw') {
      if (!applyMotionEffect(wrap, sc.effect, sc.duration)) {
        // fallback: scale pop
        applyMotionEffect(wrap, 'pop', sc.duration);
      }
      setTimeout(resolve, sc.duration * 1000);
      return;
    }

    // Wipe reveal via clipPath
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

    drawHand.classList.add('visible');
    const start = performance.now();
    const dur = sc.duration * 1000;
    function frame(now) {
      if (abort.stop) { drawHand.classList.remove('visible'); return resolve(); }
      const t01 = Math.min(1, (now - start) / dur);
      const w = bbox.width * t01;
      let handX, handY = bbox.y + bbox.height * 0.7;
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

    if (sc.effect !== 'draw' && applyMotionEffect(wrap, sc.effect, sc.duration)) {
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
  renderCategories();
  renderLibrary();
  renderScenes();
  renderCanvas();
  syncProps();
}

(async function bootstrap() {
  const user = await WB_API.Auth.me();
  if (user) onLoginSuccess(user);
  else authModal.classList.add('show');
})();

console.log('%cWhiteBoard Studio v3 (client/server)', 'color:#ffb547;font-size:18px;font-weight:bold');
