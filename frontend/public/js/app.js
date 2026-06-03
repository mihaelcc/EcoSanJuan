// ─────────────────────────────────────────────────────────────────
//  EcoSanJuan — app.js  (Frontend SPA)
// ─────────────────────────────────────────────────────────────────

// ── Estado global ─────────────────────────────────────────────────
let TOKEN      = localStorage.getItem('eco_token') || null;
let USER       = JSON.parse(localStorage.getItem('eco_user') || 'null');
let viewStack  = [];

// Timer
let timerInterval = null;
let timerSeconds   = 0;
let timerRunning   = false;

// Calendario
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calEventos = JSON.parse(localStorage.getItem('eco_cal_events') || '[]');

// ── API helper ────────────────────────────────────────────────────
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': TOKEN || '' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── Navegación ────────────────────────────────────────────────────
function goView(id) {
  const prev = document.querySelector('.view.active');
  if (prev) {
    prev.classList.remove('active');
    viewStack.push(prev.id);
  }
  const next = document.getElementById(id);
  if (next) {
    next.classList.add('active');
    // Carga de datos al entrar a cada vista
    onViewEnter(id);
  }
}

function goBack() {
  const prev = viewStack.pop();
  if (!prev) return;
  document.querySelector('.view.active')?.classList.remove('active');
  const el = document.getElementById(prev);
  if (el) el.classList.add('active');
}

function bnav(viewId, navId, btn) {
  goView(viewId);
  if (navId) {
    document.querySelectorAll(`#${navId} .bnav-item`).forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }
}

function onViewEnter(id) {
  switch(id) {
    case 'v-home-user':      loadDashboardUser(); break;
    case 'v-registro':       loadRegistroView(); break;
    case 'v-tiempo':         loadTiemposView(); break;
    case 'v-calendario':     renderCalendario(); break;
    case 'v-mapa':           renderMapa(); break;
    case 'v-reportes-user':  loadReportesUser(); break;
    case 'v-perfil':         loadPerfil(); break;
    case 'v-home-admin':     loadDashboardAdmin(); break;
    case 'v-admin-usuarios': loadAdminUsuarios(); break;
    case 'v-admin-reportes': loadAdminReportes(); break;
    case 'v-admin-registros':loadAdminRegistros(); break;
    case 'v-admin-tiempos':  loadAdminTiempos(); break;
    case 'v-notif-user':     loadNotificaciones('notif-user-list'); break;
    case 'v-notif-admin':    loadNotificaciones('notif-admin-list'); break;
    case 'v-admin-contactos':loadContactos(); break;
    case 'v-mis-stats':      loadMisStats(); break;
  }
}

// ── LOGIN / SPLASH ────────────────────────────────────────────────
let loginRol = 'usuario';

function showLogin(rol) {
  loginRol = rol;
  document.getElementById('splash').style.display = 'none';
  const loginEl = document.getElementById('login');
  loginEl.style.display = 'flex';
  // Prefill para demo
  if (rol === 'admin') {
    document.getElementById('login-dni').value  = 'admin';
    document.getElementById('login-pass').value = 'admin123';
  } else {
    document.getElementById('login-dni').value  = '71433258';
    document.getElementById('login-pass').value = 'user123';
  }
}

function backToSplash() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('splash').style.display = 'flex';
}

async function doLogin() {
  const dni  = document.getElementById('login-dni').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err  = document.getElementById('login-error');
  const btn  = document.getElementById('login-btn');
  err.style.display = 'none';
  btn.textContent = 'Iniciando...';
  btn.disabled = true;
  try {
    const data = await api('POST', '/api/login', { dni, password: pass });
    TOKEN = data.token;
    USER  = data.user;
    localStorage.setItem('eco_token', TOKEN);
    localStorage.setItem('eco_user',  JSON.stringify(USER));
    document.getElementById('login').style.display = 'none';
    initApp();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  } finally {
    btn.textContent = 'COMENZAR';
    btn.disabled = false;
  }
}

function logout() {
  TOKEN = null; USER = null;
  localStorage.removeItem('eco_token');
  localStorage.removeItem('eco_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('splash').style.display = 'flex';
  viewStack = [];
  stopTimer();
}

// ── INIT APP ──────────────────────────────────────────────────────
function initApp() {
  if (!TOKEN || !USER) {
    document.getElementById('splash').style.display = 'flex';
    return;
  }
  document.getElementById('splash').style.display = 'none';
  document.getElementById('login').style.display  = 'none';
  document.getElementById('app').style.display    = 'flex';
  viewStack = [];
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Header con nombre
  const headerName = document.getElementById('user-name-header');
  if (headerName) headerName.textContent = USER.nombre.split(' ')[0].toUpperCase();

  // Admin drawer
  const mn = document.getElementById('admin-menu-name');
  const me = document.getElementById('admin-menu-email');
  if (mn) mn.textContent = USER.nombre;
  if (me) me.textContent = USER.email;

  // Ir a la vista principal según rol
  if (USER.rol === 'admin') {
    goView('v-home-admin');
  } else {
    goView('v-home-user');
  }

  // Reloj
  startClock();
}

// ── CLOCK ─────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    ['clock-u','clock-a','clock-r'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = t;
    });
  }
  tick();
  setInterval(tick, 30000);
}

// ── DASHBOARD USUARIO ─────────────────────────────────────────────
async function loadDashboardUser() {
  try {
    const d = await api('GET', '/api/dashboard');
    setEl('bolsas-semana-u', d.bolsasSemana);
    setEl('bolsas-hoy-u', d.bolsasHoy);
    const bar = document.getElementById('cumpl-bar');
    if (bar) bar.style.width = d.cumplimiento + '%';
    setEl('cumpl-pct', d.cumplimiento + '%');
    setEl('prox-recojo', '🚛 Próximo recojo: ' + d.proximoRecojo);
  } catch (e) { console.error(e); }
}

// ── REGISTRO DE BOLSAS ────────────────────────────────────────────
let bolsasCount = 1;
let tipoSeleccionado = 'organico';
let selectivaSeleccionada = true;

function loadRegistroView() {
  const now = new Date();
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  setEl('reg-fecha', `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`);
  setEl('reg-hora', `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
  setEl('reg-user-name', USER?.nombre || '—');
  setEl('reg-user-dni', USER?.dni || '—');
  loadMisRegistros();
}

function changeBolsas(delta) {
  bolsasCount = Math.max(1, Math.min(20, bolsasCount + delta));
  setEl('bolsas-count', bolsasCount);
}

function selectTipo(tipo) {
  tipoSeleccionado = tipo;
  ['organico','reciclable','general'].forEach(t => {
    const btn = document.getElementById('tipo-' + t);
    if (btn) btn.classList.toggle('selected', t === tipo);
  });
}

function selectSelectiva(val) {
  selectivaSeleccionada = val;
  document.getElementById('sel-si')?.classList.toggle('selected', val);
  document.getElementById('sel-no')?.classList.toggle('selected', !val);
}

async function registrarBolsas() {
  try {
    await api('POST', '/api/residuos', {
      bolsas: bolsasCount,
      tipo: tipoSeleccionado,
      zona: document.getElementById('reg-zona').value,
      selectiva: selectivaSeleccionada ? 1 : 0,
      observaciones: document.getElementById('reg-obs').value
    });
    toast('✅ Registro guardado exitosamente');
    document.getElementById('reg-obs').value = '';
    bolsasCount = 1;
    setEl('bolsas-count', 1);
    loadMisRegistros();
    loadDashboardUser();
  } catch (e) { toast('❌ ' + e.message); }
}

async function loadMisRegistros() {
  const el = document.getElementById('mis-registros-list');
  if (!el) return;
  try {
    const rows = await api('GET', '/api/residuos');
    if (!rows.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📦</span><span class="empty-text">Sin registros aún</span></div>'; return; }
    el.innerHTML = rows.slice(0,5).map(r => `
      <div style="display:flex;align-items:center;gap:.5rem;padding:.45rem 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.1rem;">${tipoIcon(r.tipo)}</span>
        <div style="flex:1;">
          <div style="font-size:.8rem;font-weight:600;color:var(--text);">${r.bolsas} bolsa${r.bolsas>1?'s':''} · ${r.zona}</div>
          <div style="font-size:.7rem;color:var(--text-gray);">${r.fecha} ${r.hora}</div>
        </div>
        <span class="badge ${tipoBadge(r.tipo)}">${r.tipo}</span>
      </div>
    `).join('');
  } catch (e) { el.innerHTML = '<div class="empty"><span class="empty-text">Error cargando</span></div>'; }
}

// ── TIMER ─────────────────────────────────────────────────────────
function loadTiemposView() {
  loadDashboardUser().then(() => {});
  api('GET', '/api/dashboard').then(d => {
    setEl('avg-diario',   d.promedioPost + ' min');
    setEl('avg-semanal',  d.promedioPre  + ' min (PRE)');
    setEl('prox-t', d.proximoRecojo);
  }).catch(() => {});
  loadMisTiempos();
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timer-play-btn').textContent = '▶';
    setEl('timer-status', '⏸ Pausado. Presiona ▶ para continuar.');
  } else {
    timerRunning = true;
    document.getElementById('timer-play-btn').textContent = '⏸';
    setEl('timer-status', '⏱ Midiendo tiempo...');
    timerInterval = setInterval(() => {
      timerSeconds++;
      const h = String(Math.floor(timerSeconds/3600)).padStart(2,'0');
      const m = String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0');
      const s = String(timerSeconds%60).padStart(2,'0');
      setEl('timer-display', `${h}:${m}:${s}`);
    }, 1000);
  }
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  setEl('timer-display', '00:00:00');
  setEl('timer-status', 'Presiona ▶ para iniciar el cronómetro');
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('timer-play-btn') && (document.getElementById('timer-play-btn').textContent = '▶');
}

async function saveTimer() {
  if (timerSeconds < 5) { toast('⚠️ Inicia el cronómetro primero'); return; }
  try {
    await api('POST', '/api/tiempos', { segundos: timerSeconds });
    toast(`✅ Tiempo de ${fmtSec(timerSeconds)} guardado`);
    resetTimer();
    loadMisTiempos();
  } catch (e) { toast('❌ ' + e.message); }
}

async function loadMisTiempos() {
  const el = document.getElementById('mis-tiempos-list');
  if (!el) return;
  try {
    const rows = await api('GET', '/api/tiempos');
    if (!rows.length) { el.innerHTML = 'Sin registros de tiempo aún.'; return; }
    const avg = rows.reduce((a,r) => a + r.segundos, 0) / rows.length;
    const trendEl = document.getElementById('trend-tag-wrap');
    if (trendEl) {
      const pct = rows.length > 1 ? Math.round(((rows[0].segundos - rows[rows.length-1].segundos)/rows[rows.length-1].segundos)*100) : 0;
      trendEl.innerHTML = pct <= 0
        ? `<span class="trend-tag trend-up">↓ Reducción del ${Math.abs(pct)}% respecto a la semana anterior</span>`
        : `<span class="trend-tag trend-down">↑ Aumento del ${pct}% respecto a la semana anterior</span>`;
    }
    el.innerHTML = rows.slice(0,5).map(r =>
      `<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.8rem;">
        <span style="color:var(--text-mid);">${r.fecha}</span>
        <span style="font-weight:700;">${fmtSec(r.segundos)}</span>
        <span class="badge ${r.tipo==='POST'?'badge-green':'badge-yellow'}">${r.tipo}</span>
       </div>`
    ).join('');
  } catch (e) { el.innerHTML = 'Error cargando tiempos.'; }
}

// ── CALENDARIO ────────────────────────────────────────────────────
function renderCalendario() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const diasNombres = ['dom','lun','mar','mié','jue','vie','sáb'];
  const hoy = new Date();
  setEl('cal-mes-label', `${meses[calMonth]} ${calYear}`);

  // Reloj del cal
  function tickCal() {
    const n = new Date();
    const hora = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')} ${n.getHours()>=12?'pm':'am'}`;
    const diasNom = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const mesesNom = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    setEl('cal-hora', hora);
    setEl('cal-fecha-larga', `${diasNom[n.getDay()]}, ${String(n.getDate()).padStart(2,'0')} de ${mesesNom[n.getMonth()]}`);
  }
  tickCal(); setInterval(tickCal, 1000);

  // Próximo recojo
  api('GET','/api/dashboard').then(d => {
    setEl('cal-prox-recojo', '🚛 Próximo recojo: ' + d.proximoRecojo);
    setEl('cal-stats', `✅ Días cumplidos: ${d.bolsasSemana > 0 ? '5' : '0'} &nbsp;&nbsp; ⚠️ Días con retraso: 2`);
  }).catch(() => {});

  // Grid del mes
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  let html = diasNombres.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === hoy.getDate() && calMonth === hoy.getMonth() && calYear === hoy.getFullYear();
    const hasRec = [1,3,5,8,10,12,15,17,19,22].includes(d); // días con registro (demo)
    html += `<div class="cal-day ${isToday?'today':''} ${hasRec&&!isToday?'has-record':''}">${d}</div>`;
  }
  grid.innerHTML = html;
  renderCalEventos();
}

function changeMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendario();
}

function addCalEvent() {
  const inp = document.getElementById('cal-evento');
  if (!inp.value.trim()) return;
  calEventos.push({ texto: inp.value.trim(), fecha: new Date().toLocaleDateString('es-PE') });
  localStorage.setItem('eco_cal_events', JSON.stringify(calEventos));
  inp.value = '';
  renderCalEventos();
}

function renderCalEventos() {
  const el = document.getElementById('cal-eventos-list');
  if (!el) return;
  el.innerHTML = calEventos.slice(-5).reverse().map((e,i) =>
    `<div style="display:flex;gap:.5rem;align-items:center;padding:.3rem 0;border-bottom:1px solid var(--border);">
      <span style="font-size:.75rem;color:var(--text-gray);">${e.fecha}</span>
      <span style="font-size:.8rem;flex:1;">${e.texto}</span>
      <span style="cursor:pointer;color:var(--text-gray);" onclick="removeCalEvent(${i})">✕</span>
     </div>`
  ).join('') || '<div style="font-size:.78rem;color:var(--text-gray);">Sin eventos</div>';
}

function removeCalEvent(i) {
  calEventos.splice(calEventos.length-1-i, 1);
  localStorage.setItem('eco_cal_events', JSON.stringify(calEventos));
  renderCalEventos();
}

// ── MAPA ──────────────────────────────────────────────────────────
const PUNTOS = [
  { nombre:'Res. Héroes de San Juan', tipo:'reciclable', hora:'18:00', dist:'120m', dir:'Av. Pedro Miotta 456' },
  { nombre:'Parque Los Jardines',      tipo:'organico',   hora:'18:30', dist:'240m', dir:'Jr. Las Flores 123' },
  { nombre:'ACOPIO 56 Central',        tipo:'general',    hora:'17:30', dist:'350m', dir:'Av. San Juan 890' },
  { nombre:'Punto Verde Bloque B',     tipo:'reciclable', hora:'18:00', dist:'80m',  dir:'Interior Condominio' },
];
let mapaFiltro = 'all';
function filterMap(f, btn) {
  mapaFiltro = f;
  document.querySelectorAll('#v-mapa .radio-btn').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
  renderMapa();
}
function renderMapa() {
  const filtered = mapaFiltro === 'all' ? PUNTOS : PUNTOS.filter(p => p.tipo === mapaFiltro);
  setEl('map-points-count', `${filtered.length} puntos activos`);
  const el = document.getElementById('puntos-list');
  if (!el) return;
  el.innerHTML = filtered.map(p => `
    <div class="card" style="padding:.85rem;">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem;">
        <span style="font-size:1.2rem;">${tipoIcon(p.tipo)}</span>
        <div><div style="font-size:.85rem;font-weight:700;color:var(--text);">${p.nombre}</div>
        <div style="font-size:.7rem;color:var(--text-gray);">${p.dir}</div></div>
      </div>
      <div style="display:flex;gap:.75rem;font-size:.72rem;color:var(--text-gray);">
        <span>⏰ ${p.hora}</span><span>📍 ${p.dist}</span>
        <span class="badge ${tipoBadge(p.tipo)}">${p.tipo}</span>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:.6rem;" onclick="toast('🗺️ Abriendo mapa externo...')">VER RUTA ›</button>
    </div>
  `).join('');
}

// ── REPORTES USUARIO ─────────────────────────────────────────────
async function loadReportesUser() {
  try {
    const d = await api('GET', '/api/dashboard');
    setEl('rep-usuarios', d.totalUsuarios || '—');
    setEl('rep-total-disp', d.totalBolsas);
    setEl('rep-pre',  d.promedioPre + 'm');
    setEl('rep-post', d.promedioPost + 'm');
    setEl('rep-cumpl', d.cumplimiento + '%');
    setEl('rep-red', '-' + d.reduccion + '%');
  } catch (e) {}
}

// ── PERFIL ────────────────────────────────────────────────────────
async function loadPerfil() {
  setEl('perfil-nombre', USER?.nombre || '—');
  setEl('perfil-email', USER?.email || '—');
  setEl('perfil-bloque', USER?.bloque ? 'Bloque ' + USER.bloque : '—');
  try {
    const [res, ts] = await Promise.all([api('GET','/api/residuos'), api('GET','/api/tiempos')]);
    setEl('perf-disp', res.length + ' registros totales');
    if (ts.length) {
      const avg = ts.reduce((a,r) => a+r.segundos, 0) / ts.length;
      setEl('perf-tiempo', fmtSec(Math.round(avg)));
    }
  } catch (e) {}
}

async function cambiarPassword() {
  const actual  = document.getElementById('pass-actual').value;
  const nueva   = document.getElementById('pass-nueva').value;
  const confirm = document.getElementById('pass-confirm').value;
  if (!actual || !nueva) { toast('⚠️ Completa todos los campos'); return; }
  if (nueva !== confirm) { toast('⚠️ Las contraseñas no coinciden'); return; }
  try {
    await api('PUT', '/api/me/password', { actual, nueva });
    toast('✅ Contraseña actualizada');
    goBack();
  } catch (e) { toast('❌ ' + e.message); }
}

async function loadMisStats() {
  const el = document.getElementById('mis-stats-content');
  if (!el) return;
  try {
    const [res, ts] = await Promise.all([api('GET','/api/residuos'), api('GET','/api/tiempos')]);
    const totalBolsas = res.reduce((a,r) => a+r.bolsas, 0);
    const tipoCount = {};
    res.forEach(r => tipoCount[r.tipo] = (tipoCount[r.tipo]||0)+r.bolsas);
    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card green"><div class="stat-label">Total bolsas</div><div class="stat-value">${totalBolsas}</div></div>
        <div class="stat-card yellow"><div class="stat-label">Registros</div><div class="stat-value">${res.length}</div></div>
        <div class="stat-card purple"><div class="stat-label">Orgánico</div><div class="stat-value">${tipoCount.organico||0}</div></div>
        <div class="stat-card pink"><div class="stat-label">Reciclable</div><div class="stat-value">${tipoCount.reciclable||0}</div></div>
      </div>
      <div class="card"><div class="card-title">⏱️ Tiempos registrados</div>
        ${ts.length ? ts.slice(0,8).map(r => `<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.3rem 0;border-bottom:1px solid var(--border);"><span>${r.fecha}</span><span style="font-weight:700;">${fmtSec(r.segundos)}</span><span class="badge ${r.tipo==='POST'?'badge-green':'badge-yellow'}">${r.tipo}</span></div>`).join('') : '<div class="empty"><span class="empty-text">Sin tiempos registrados</span></div>'}
      </div>
    `;
  } catch (e) { el.innerHTML = '<div class="empty"><span class="empty-text">Error cargando estadísticas</span></div>'; }
}

// ── NOTIFICACIONES ────────────────────────────────────────────────
async function loadNotificaciones(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const rows = await api('GET', '/api/notificaciones');
    if (!rows.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">🔔</span><span class="empty-text">Sin notificaciones</span></div>'; return; }
    el.innerHTML = rows.map(r => `
      <div class="card" style="${r.leida?'opacity:.6':''}cursor:pointer;" onclick="marcarLeida(${r.id},'${containerId}')">
        <div style="display:flex;gap:.5rem;align-items:flex-start;">
          <span style="font-size:1.1rem;">🔔</span>
          <div>
            <div style="font-size:.85rem;font-weight:700;">${r.titulo}</div>
            <div style="font-size:.78rem;color:var(--text-gray);margin-top:.2rem;">${r.mensaje}</div>
            <div style="font-size:.68rem;color:var(--text-gray);margin-top:.4rem;">${r.created_at?.split(' ')[0]||''} ${r.leida?'· Leída':''}</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) { el.innerHTML = '<div class="empty"><span class="empty-text">Error</span></div>'; }
}

async function marcarLeida(id, containerId) {
  try { await api('PUT', `/api/notificaciones/${id}/leer`); loadNotificaciones(containerId); } catch(e){}
}

// ── ADMIN — DASHBOARD ─────────────────────────────────────────────
async function loadDashboardAdmin() {
  try {
    const d = await api('GET', '/api/dashboard');
    setEl('admin-pre',   d.promedioPre + ' min');
    setEl('admin-post',  d.promedioPost + ' min');
    setEl('admin-red',   d.reduccion + '%');
    setEl('admin-total', d.totalBolsas);
    // Ajustar barras
    const maxH = 90;
    const maxVal = Math.max(d.promedioPre, d.promedioPost);
    const preH  = Math.round((d.promedioPre / maxVal) * maxH);
    const postH = Math.round((d.promedioPost / maxVal) * maxH);
    const bPre = document.getElementById('admin-bar-pre');
    if (bPre) bPre.style.height = preH + 'px';
    const bPost = document.getElementById('admin-bar-post');
    if (bPost) bPost.style.height = postH + 'px';
    setEl('admin-bar-pre-v', d.promedioPre);
    setEl('admin-bar-post-v', d.promedioPost);
    // Periodo
    const hoy = new Date();
    const lunesPast = new Date(hoy); lunesPast.setDate(hoy.getDate()-7);
    setEl('admin-periodo', `${lunesPast.getDate()}/${lunesPast.getMonth()+1} - ${hoy.getDate()}/${hoy.getMonth()+1} ${hoy.getFullYear()}`);
  } catch (e) {}
}

// ── ADMIN — USUARIOS ──────────────────────────────────────────────
let allUsuarios = [];
async function loadAdminUsuarios() {
  try {
    allUsuarios = await api('GET', '/api/usuarios');
    renderTablaUsuarios(allUsuarios);
  } catch (e) { toast('❌ ' + e.message); }
}

function filtrarUsuarios() {
  const q = document.getElementById('buscar-usuario').value.toLowerCase();
  renderTablaUsuarios(allUsuarios.filter(u =>
    u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.dni.includes(q)
  ));
}

function renderTablaUsuarios(rows) {
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) return;
  tbody.innerHTML = rows.map(u => `
    <tr>
      <td style="font-weight:600;">${u.nombre}</td>
      <td style="font-size:.72rem;">${u.email}</td>
      <td><span class="badge badge-blue">${u.rol}</span></td>
      <td><span class="badge ${u.activo?'badge-green':'badge-red'}">${u.activo?'Activo':'Inactivo'}</span></td>
      <td>
        <button style="background:none;border:none;cursor:pointer;font-size:.85rem;" onclick="toggleUsuario(${u.id},${u.activo})" title="${u.activo?'Desactivar':'Activar'}">
          ${u.activo?'🔒':'🔓'}
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);padding:1rem;">Sin usuarios</td></tr>';
}

async function toggleUsuario(id, activo) {
  const u = allUsuarios.find(x => x.id === id);
  if (!u) return;
  try {
    await api('PUT', `/api/usuarios/${id}`, { ...u, activo: activo ? 0 : 1 });
    toast(activo ? '🔒 Usuario desactivado' : '✅ Usuario activado');
    loadAdminUsuarios();
  } catch (e) { toast('❌ ' + e.message); }
}

function openModalNuevoUsuario() {
  document.getElementById('modal-nuevo-usuario').classList.add('open');
}

async function crearUsuario() {
  const dni    = document.getElementById('nu-dni').value.trim();
  const nombre = document.getElementById('nu-nombre').value.trim();
  const email  = document.getElementById('nu-email').value.trim();
  const pass   = document.getElementById('nu-pass').value;
  const rol    = document.getElementById('nu-rol').value;
  const bloque = document.getElementById('nu-bloque').value.trim();
  if (!dni || !nombre || !email || !pass) { toast('⚠️ Completa los campos obligatorios'); return; }
  try {
    await api('POST', '/api/usuarios', { dni, nombre, email, password: pass, rol, bloque });
    toast('✅ Usuario creado');
    closeModal('modal-nuevo-usuario');
    ['nu-dni','nu-nombre','nu-email','nu-pass','nu-bloque'].forEach(id => document.getElementById(id).value = '');
    loadAdminUsuarios();
  } catch (e) { toast('❌ ' + e.message); }
}

// ── ADMIN — REPORTES ──────────────────────────────────────────────
async function loadAdminReportes() {
  try {
    const d = await api('GET', '/api/dashboard');
    setEl('legend-pre',  d.promedioPre + ' min');
    setEl('legend-post', d.promedioPost + ' min');
    setEl('res-pre',  d.promedioPre + ' min');
    setEl('res-post', d.promedioPost + ' min');
    setEl('res-red',  d.reduccion + '%');
    setEl('res-total', d.totalBolsas);
    // Donut
    const pct = d.reduccion;
    const deg = Math.round(pct * 2.2); // 220 circunferencia * pct/100
    const donutGreen = document.getElementById('donut-green');
    if (donutGreen) donutGreen.setAttribute('stroke-dasharray', `${deg} ${220-deg}`);
    setEl('donut-label', pct + '%');
    // Tendencia
    const trend = document.getElementById('admin-trend-chart');
    const labels = document.getElementById('admin-trend-labels');
    if (trend && d.ultimos7?.length) {
      const maxB = Math.max(...d.ultimos7.map(r => r.bolsas));
      trend.innerHTML = d.ultimos7.map(r => {
        const h = Math.max(10, Math.round((r.bolsas / maxB) * 70));
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="width:100%;background:var(--g-mid);border-radius:3px 3px 0 0;height:${h}px;"></div>
          <span style="font-size:.55rem;color:var(--text-gray);">${r.bolsas}</span>
        </div>`;
      }).join('');
      if (labels) labels.innerHTML = d.ultimos7.map(r => `<span>${r.fecha?.slice(5)||r.fecha}</span>`).join('');
    }
  } catch (e) {}
}

// ── ADMIN — REGISTROS ─────────────────────────────────────────────
let allRegistros = [];
let regPage = 0;
const REG_PER_PAGE = 10;

async function loadAdminRegistros() {
  try {
    allRegistros = await api('GET', '/api/residuos');
    regPage = 0;
    renderTablaRegistros();
  } catch (e) {}
}

function filtrarRegistros() {
  const q = document.getElementById('buscar-registro')?.value.toLowerCase();
  if (!q) return renderTablaRegistros();
  const filtered = allRegistros.filter(r =>
    r.nombre?.toLowerCase().includes(q) || r.tipo.includes(q) || r.zona.toLowerCase().includes(q) || r.fecha.includes(q)
  );
  renderTablaRegistros(filtered);
}

function renderTablaRegistros(rows) {
  rows = rows || allRegistros;
  const tbody = document.getElementById('tabla-registros-admin');
  if (!tbody) return;
  const page = rows.slice(regPage * REG_PER_PAGE, (regPage+1)*REG_PER_PAGE);
  tbody.innerHTML = page.map(r => `
    <tr>
      <td>${r.fecha}</td>
      <td style="font-size:.72rem;">${r.nombre||'—'}</td>
      <td style="text-align:center;font-weight:700;">${r.bolsas}</td>
      <td><span class="badge ${tipoBadge(r.tipo)}">${r.tipo}</span></td>
      <td style="font-size:.72rem;">${r.zona}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-gray);">Sin registros</td></tr>';
  // Paginación
  const totalPags = Math.ceil(rows.length / REG_PER_PAGE);
  const pag = document.getElementById('reg-paginacion');
  if (pag) {
    pag.innerHTML = Array.from({length:totalPags},(_,i) =>
      `<button onclick="regPage=${i};renderTablaRegistros()" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:${i===regPage?'var(--g-mid)':'white'};color:${i===regPage?'white':'var(--text-gray)'};cursor:pointer;font-size:.78rem;">${i+1}</button>`
    ).join('');
  }
}

// ── ADMIN — TIEMPOS ───────────────────────────────────────────────
async function loadAdminTiempos() {
  try {
    const rows = await api('GET', '/api/tiempos');
    const tbody = document.getElementById('tabla-tiempos-admin');
    if (!tbody) return;
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.fecha}</td>
        <td style="font-size:.72rem;">${r.nombre||'—'}</td>
        <td style="font-weight:700;">${fmtSec(r.segundos)}</td>
        <td><span class="badge ${r.tipo==='POST'?'badge-green':'badge-yellow'}">${r.tipo}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--text-gray);">Sin tiempos</td></tr>';
  } catch (e) {}
}

// ── ADMIN — NOTIFICACIONES ────────────────────────────────────────
function openModalNotif() {
  document.getElementById('modal-notif').classList.add('open');
}
async function enviarNotif() {
  const titulo  = document.getElementById('notif-titulo').value.trim();
  const mensaje = document.getElementById('notif-mensaje').value.trim();
  if (!titulo || !mensaje) { toast('⚠️ Completa los campos'); return; }
  try {
    await api('POST', '/api/notificaciones', { titulo, mensaje });
    toast('✅ Notificación enviada a todos los usuarios');
    closeModal('modal-notif');
    document.getElementById('notif-titulo').value = '';
    document.getElementById('notif-mensaje').value = '';
    loadNotificaciones('notif-admin-list');
  } catch (e) { toast('❌ ' + e.message); }
}

// ── ADMIN — CONTACTOS ─────────────────────────────────────────────
async function loadContactos() {
  const el = document.getElementById('contactos-list');
  if (!el) return;
  try {
    const rows = await api('GET', '/api/contactos');
    el.innerHTML = rows.length
      ? rows.map(r => `
        <div class="card">
          <div style="font-size:.85rem;font-weight:700;">${r.nombre}</div>
          <div style="font-size:.72rem;color:var(--text-gray);margin-bottom:.4rem;">${r.email} · ${r.institucion||''} · ${r.created_at?.split(' ')[0]||''}</div>
          <div style="font-size:.72rem;font-weight:600;color:var(--g-dark);">${r.motivo||'Consulta'}</div>
          <div style="font-size:.8rem;color:var(--text-mid);margin-top:.3rem;">${r.mensaje}</div>
        </div>
      `).join('')
      : '<div class="empty"><span class="empty-icon">📬</span><span class="empty-text">Sin mensajes aún</span></div>';
  } catch (e) { el.innerHTML = '<div class="empty"><span class="empty-text">Error</span></div>'; }
}

// ── MODALES ───────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
function openAdminMenu() {
  const el = document.getElementById('admin-menu-overlay');
  if (el) el.style.display = 'flex';
}
function closeAdminMenu() {
  const el = document.getElementById('admin-menu-overlay');
  if (el) el.style.display = 'none';
}

// ── HELPERS ───────────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function tipoIcon(tipo) {
  return tipo === 'organico' ? '🌿' : tipo === 'reciclable' ? '♻️' : '🗑️';
}

function tipoBadge(tipo) {
  return tipo === 'organico' ? 'badge-green' : tipo === 'reciclable' ? 'badge-blue' : 'badge-gray';
}

function fmtSec(segundos) {
  const m = Math.floor(segundos/60);
  const s = segundos%60;
  if (m >= 60) return `${Math.floor(m/60)}h ${m%60}m`;
  return `${m}m ${String(s).padStart(2,'0')}s`;
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (TOKEN && USER) {
    document.getElementById('splash').style.display = 'none';
    initApp();
  }
});

// Cerrar modales al hacer click afuera
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});
