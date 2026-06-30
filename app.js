// ─────────────────────────────────────────────────────────────────
//  EcoSanJuan — app.js (Frontend SPA)
// ─────────────────────────────────────────────────────────────────
let TOKEN = localStorage.getItem('eco_token') || null;
let USER  = JSON.parse(localStorage.getItem('eco_user') || 'null');
let viewStack = [];
let calYear = 2025, calMonth = 11; // Diciembre 2025
let calEventos = JSON.parse(localStorage.getItem('eco_cal_events') || '[]');

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type':'application/json', 'Authorization':TOKEN||'' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

function toast(msg, dur=2800) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

function goView(id) {
  const prev = document.querySelector('.view.active');
  if (prev) { prev.classList.remove('active'); viewStack.push(prev.id); }
  const next = document.getElementById(id);
  if (next) { next.classList.add('active'); onViewEnter(id); }
}
function goBack() {
  const prev = viewStack.pop();
  if (!prev) return;
  document.querySelector('.view.active')?.classList.remove('active');
  document.getElementById(prev)?.classList.add('active');
}
function bnav(viewId, navId, btn) {
  goView(viewId);
  if (navId) { document.querySelectorAll(`#${navId} .bnav-item`).forEach(b=>b.classList.remove('active')); if (btn) btn.classList.add('active'); }
}
function onViewEnter(id) {
  switch(id) {
    case 'v-home-user': loadDashboardUser(); break;
    case 'v-registro': loadRegistroView(); break;
    case 'v-tiempo': loadTiemposView(); break;
    case 'v-calendario': renderCalendario(); break;
    case 'v-reportes-user': loadReportesUser(); break;
    case 'v-perfil': loadPerfil(); break;
    case 'v-home-admin': loadDashboardAdmin(); break;
    case 'v-admin-usuarios': loadAdminUsuarios(); break;
    case 'v-admin-reportes': loadAdminReportes(); break;
    case 'v-admin-registros': loadAdminRegistros(); break;
    case 'v-admin-tiempos': loadAdminTiempos(); break;
    case 'v-notif-user': loadNotificaciones('notif-user-list'); break;
    case 'v-notif-admin': loadNotificaciones('notif-admin-list'); break;
    case 'v-admin-contactos': loadContactos(); break;
  }
}

let loginRol = 'usuario';
function showLogin(rol) {
  loginRol = rol;
  document.getElementById('splash').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  if (rol === 'admin') {
    document.getElementById('login-dni').value = 'admin';
    document.getElementById('login-pass').value = 'admin123';
  } else {
    document.getElementById('login-dni').value = '';
    document.getElementById('login-pass').value = '';
  }
}
function backToSplash() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('splash').style.display = 'flex';
}
async function doLogin() {
  const dni = document.getElementById('login-dni').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  err.style.display = 'none'; btn.textContent = 'Iniciando...'; btn.disabled = true;
  try {
    const data = await api('POST','/api/login',{ dni, password:pass });
    TOKEN = data.token; USER = data.user;
    localStorage.setItem('eco_token', TOKEN);
    localStorage.setItem('eco_user', JSON.stringify(USER));
    document.getElementById('login').style.display = 'none';
    initApp();
  } catch (e) { err.textContent = e.message; err.style.display = 'block'; }
  finally { btn.textContent = 'COMENZAR'; btn.disabled = false; }
}
function logout() {
  TOKEN = null; USER = null;
  localStorage.removeItem('eco_token'); localStorage.removeItem('eco_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('splash').style.display = 'flex';
  viewStack = [];
}

function initApp() {
  if (!TOKEN || !USER) { document.getElementById('splash').style.display = 'flex'; return; }
  document.getElementById('splash').style.display = 'none';
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  viewStack = [];
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const hn = document.getElementById('user-name-header');
  if (hn) hn.textContent = USER.nombre.split(' ')[0].toUpperCase();
  const mn = document.getElementById('admin-menu-name'); if (mn) mn.textContent = USER.nombre;
  const me = document.getElementById('admin-menu-email'); if (me) me.textContent = USER.email;
  if (USER.rol === 'admin') goView('v-home-admin'); else goView('v-home-user');
  startClock();
}

function startClock() {
  function tick() {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    ['clock-u','clock-a','clock-r'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = t; });
  }
  tick(); setInterval(tick, 30000);
}

async function loadDashboardUser() {
  try {
    const d = await api('GET','/api/dashboard');
    setEl('bolsas-semana-u', d.bolsasPost);
    setEl('bolsas-hoy-u', d.totalBolsas);
    const bar = document.getElementById('cumpl-bar'); if (bar) bar.style.width = d.cumplimiento + '%';
    setEl('cumpl-pct', d.cumplimiento + '%');
    setEl('prox-recojo', '🚛 Próximo recojo: ' + d.proximoRecojo);
  } catch(e){ console.error(e); }
}

let bolsasCount = 1, tipoSeleccionado = 'organico', selectivaSeleccionada = true;
function loadRegistroView() {
  const now = new Date();
  setEl('reg-fecha', `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`);
  setEl('reg-hora', `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} (al registrar)`);
  setEl('reg-user-name', USER?.nombre || '—');
  setEl('reg-user-dni', USER?.dni || '—');
  // Preseleccionar zona del usuario
  if (USER?.zona) { const sel = document.getElementById('reg-zona'); if (sel) sel.value = 'ZONA ' + USER.zona; }
  loadMisRegistros();
}
function changeBolsas(delta) { bolsasCount = Math.max(1, Math.min(20, bolsasCount + delta)); setEl('bolsas-count', bolsasCount); }
function selectTipo(tipo) { tipoSeleccionado = tipo; ['organico','reciclable','general'].forEach(t => document.getElementById('tipo-'+t)?.classList.toggle('selected', t===tipo)); }
function selectSelectiva(val) { selectivaSeleccionada = val; document.getElementById('sel-si')?.classList.toggle('selected', val); document.getElementById('sel-no')?.classList.toggle('selected', !val); }

async function registrarBolsas() {
  try {
    const r = await api('POST','/api/residuos',{ bolsas:bolsasCount, tipo:tipoSeleccionado, zona:document.getElementById('reg-zona').value, selectiva:selectivaSeleccionada?1:0, observaciones:document.getElementById('reg-obs').value });
    toast(`✅ Registrado a las ${r.hora} (demora: ${r.demora_min} min)`);
    document.getElementById('reg-obs').value = '';
    bolsasCount = 1; setEl('bolsas-count', 1);
    loadMisRegistros(); loadDashboardUser();
  } catch(e){ toast('❌ ' + e.message); }
}

async function loadMisRegistros() {
  const el = document.getElementById('mis-registros-list'); if (!el) return;
  try {
    const rows = await api('GET','/api/residuos');
    if (!rows.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📦</span><span class="empty-text">Sin registros aún</span></div>'; return; }
    el.innerHTML = rows.slice(0,6).map(r => `
      <div style="display:flex;align-items:center;gap:.5rem;padding:.45rem 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.1rem;">${tipoIcon(r.tipo)}</span>
        <div style="flex:1;"><div style="font-size:.8rem;font-weight:600;color:var(--text);">${r.bolsas} bolsa${r.bolsas>1?'s':''} · ${r.zona}</div><div style="font-size:.7rem;color:var(--text-gray);">${r.fecha} · ${r.hora}</div></div>
        <span class="badge ${tipoBadge(r.tipo)}">${r.tipo}</span>
      </div>`).join('');
  } catch(e){ el.innerHTML = '<div class="empty"><span class="empty-text">Error cargando</span></div>'; }
}

function loadTiemposView() {
  api('GET','/api/dashboard').then(d => {
    setEl('avg-semanal', d.promedioPost + ' min');
    setEl('prox-t', d.proximoRecojo);
  }).catch(()=>{});
  loadMisTiempos();
}
async function loadMisTiempos() {
  const el = document.getElementById('mis-tiempos-list'); if (!el) return;
  try {
    const rows = await api('GET','/api/tiempos');
    if (!rows.length) { el.innerHTML = 'Sin registros de tiempo aún.'; return; }
    const avg = rows.reduce((a,r)=>a+r.segundos,0)/rows.length;
    setEl('avg-diario', fmtSec(Math.round(avg)));
    const post = rows.filter(r=>r.tipo==='POST'), pre = rows.filter(r=>r.tipo==='PRE');
    const trendEl = document.getElementById('trend-tag-wrap');
    if (trendEl && post.length && pre.length) {
      const avgPre = pre.reduce((a,r)=>a+r.segundos,0)/pre.length;
      const avgPost = post.reduce((a,r)=>a+r.segundos,0)/post.length;
      const pct = Math.round((1 - avgPost/avgPre)*100);
      trendEl.innerHTML = `<span class="trend-tag trend-up">↓ Reducción del ${pct}% del tiempo (PRE vs POST)</span>`;
    }
    el.innerHTML = rows.slice(0,8).map(r => `<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.8rem;"><span style="color:var(--text-mid);">${r.fecha}</span><span style="font-weight:700;">${fmtSec(r.segundos)}</span><span class="badge ${r.tipo==='POST'?'badge-green':'badge-yellow'}">${r.tipo}</span></div>`).join('');
  } catch(e){ el.innerHTML = 'Error cargando tiempos.'; }
}

function renderCalendario() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const diasNombres = ['dom','lun','mar','mié','jue','vie','sáb'];
  const hoy = new Date();
  setEl('cal-mes-label', `${meses[calMonth]} ${calYear}`);
  function tickCal() {
    const n = new Date();
    const hora = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')} ${n.getHours()>=12?'pm':'am'}`;
    const dN = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const mN = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    setEl('cal-hora', hora);
    setEl('cal-fecha-larga', `${dN[n.getDay()]}, ${String(n.getDate()).padStart(2,'0')} de ${mN[n.getMonth()]}`);
  }
  tickCal(); if (!window._calInterval) window._calInterval = setInterval(tickCal, 1000);
  setEl('cal-prox-recojo', '🚛 Próximo recojo: Lunes 18:00');
  setEl('cal-stats', '✅ Días cumplidos: 5 \u00a0\u00a0 ⚠️ Días con retraso: 2');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const grid = document.getElementById('cal-grid'); if (!grid) return;
  let html = diasNombres.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  for (let i=0;i<firstDay;i++) html += '<div class="cal-day empty"></div>';
  for (let d=1;d<=daysInMonth;d++) {
    const isToday = d===hoy.getDate() && calMonth===hoy.getMonth() && calYear===hoy.getFullYear();
    // Marcar días PRE (8-14) y POST (15-21) en diciembre
    const hasRec = calMonth===11 && d>=8 && d<=21;
    html += `<div class="cal-day ${isToday?'today':''} ${hasRec&&!isToday?'has-record':''}">${d}</div>`;
  }
  grid.innerHTML = html;
  renderCalEventos();
}
function changeMonth(delta) { calMonth += delta; if (calMonth<0){calMonth=11;calYear--;} if (calMonth>11){calMonth=0;calYear++;} renderCalendario(); }
function addCalEvent() {
  const inp = document.getElementById('cal-evento'); if (!inp.value.trim()) return;
  calEventos.push({ texto:inp.value.trim(), fecha:new Date().toLocaleDateString('es-PE') });
  localStorage.setItem('eco_cal_events', JSON.stringify(calEventos)); inp.value=''; renderCalEventos();
}
function renderCalEventos() {
  const el = document.getElementById('cal-eventos-list'); if (!el) return;
  el.innerHTML = calEventos.slice(-5).reverse().map((e,i) => `<div style="display:flex;gap:.5rem;align-items:center;padding:.3rem 0;border-bottom:1px solid var(--border);"><span style="font-size:.75rem;color:var(--text-gray);">${e.fecha}</span><span style="font-size:.8rem;flex:1;">${e.texto}</span><span style="cursor:pointer;color:var(--text-gray);" onclick="removeCalEvent(${i})">✕</span></div>`).join('') || '<div style="font-size:.78rem;color:var(--text-gray);">Sin eventos</div>';
}
function removeCalEvent(i) { calEventos.splice(calEventos.length-1-i,1); localStorage.setItem('eco_cal_events', JSON.stringify(calEventos)); renderCalEventos(); }

async function loadReportesUser() {
  try {
    const d = await api('GET','/api/dashboard');
    setEl('rep-usuarios', d.totalUsuarios || '—');
    setEl('rep-total-disp', d.totalBolsas);
    setEl('rep-pre', d.promedioPre + 'm');
    setEl('rep-post', d.promedioPost + 'm');
    setEl('rep-cumpl', d.cumplimiento + '%');
    setEl('rep-red', '-' + d.reduccion + '%');
  } catch(e){}
}

async function loadPerfil() {
  setEl('perfil-nombre', USER?.nombre || '—');
  setEl('perfil-email', USER?.email || '—');
  setEl('perfil-bloque', USER?.bloque ? 'Depto ' + USER.bloque + ' · Zona ' + (USER.zona||'') : '—');
  try {
    const [res, ts] = await Promise.all([api('GET','/api/residuos'), api('GET','/api/tiempos')]);
    setEl('perf-disp', res.length + ' registros · ' + res.reduce((a,r)=>a+r.bolsas,0) + ' bolsas');
    if (ts.length) { const avg = ts.reduce((a,r)=>a+r.segundos,0)/ts.length; setEl('perf-tiempo', fmtSec(Math.round(avg))); }
  } catch(e){}
}
async function cambiarPassword() {
  const actual = document.getElementById('pass-actual').value;
  const nueva = document.getElementById('pass-nueva').value;
  const confirm = document.getElementById('pass-confirm').value;
  if (!actual || !nueva) { toast('⚠️ Completa todos los campos'); return; }
  if (nueva !== confirm) { toast('⚠️ Las contraseñas no coinciden'); return; }
  try { await api('PUT','/api/me/password',{ actual, nueva }); toast('✅ Contraseña actualizada'); goBack(); }
  catch(e){ toast('❌ ' + e.message); }
}

async function loadNotificaciones(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  try {
    const rows = await api('GET','/api/notificaciones');
    if (!rows.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">🔔</span><span class="empty-text">Sin notificaciones</span></div>'; return; }
    el.innerHTML = rows.map(r => `<div class="card" style="${r.leida?'opacity:.6;':''}cursor:pointer;" onclick="marcarLeida(${r.id},'${containerId}')"><div style="display:flex;gap:.5rem;align-items:flex-start;"><span style="font-size:1.1rem;">🔔</span><div><div style="font-size:.85rem;font-weight:700;">${r.titulo}</div><div style="font-size:.78rem;color:var(--text-gray);margin-top:.2rem;">${r.mensaje}</div><div style="font-size:.68rem;color:var(--text-gray);margin-top:.4rem;">${r.created_at?.split(' ')[0]||''} ${r.leida?'· Leída':''}</div></div></div></div>`).join('');
  } catch(e){ el.innerHTML = '<div class="empty"><span class="empty-text">Error</span></div>'; }
}
async function marcarLeida(id, containerId) { try { await api('PUT',`/api/notificaciones/${id}/leer`); loadNotificaciones(containerId); } catch(e){} }

// ── ADMIN ──
async function loadDashboardAdmin() {
  try {
    const d = await api('GET','/api/dashboard');
    setEl('admin-pre', d.promedioPre + ' min');
    setEl('admin-post', d.promedioPost + ' min');
    setEl('admin-red', d.reduccion + '%');
    setEl('admin-total', d.totalResiduos);
    const maxVal = Math.max(d.promedioPre, d.promedioPost);
    const bPre = document.getElementById('admin-bar-pre'); if (bPre) bPre.style.height = Math.round((d.promedioPre/maxVal)*90)+'px';
    const bPost = document.getElementById('admin-bar-post'); if (bPost) bPost.style.height = Math.round((d.promedioPost/maxVal)*90)+'px';
    setEl('admin-bar-pre-v', d.promedioPre); setEl('admin-bar-post-v', d.promedioPost);
    // Zonas
    const zEl = document.getElementById('admin-zonas');
    if (zEl && d.porZona) {
      const maxZ = Math.max(...d.porZona.map(z=>z.bolsas), 1);
      zEl.innerHTML = d.porZona.map(z => `<div style="margin-bottom:.5rem;"><div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.2rem;"><span style="font-weight:600;">Zona ${z.zona} (${z.usuarios} usuarios)</span><span style="font-weight:700;color:var(--g-dark);">${z.bolsas} bolsas</span></div><div style="background:var(--border);border-radius:100px;height:8px;overflow:hidden;"><div style="background:var(--g-mid);height:100%;width:${Math.round((z.bolsas/maxZ)*100)}%;border-radius:100px;"></div></div></div>`).join('');
    }
  } catch(e){}
}

let allUsuarios = [];
async function loadAdminUsuarios() {
  try { allUsuarios = await api('GET','/api/usuarios'); renderTablaUsuarios(allUsuarios); } catch(e){ toast('❌ '+e.message); }
}
function filtrarUsuarios() {
  const q = document.getElementById('buscar-usuario').value.toLowerCase();
  renderTablaUsuarios(allUsuarios.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.dni.includes(q)));
}
function renderTablaUsuarios(rows) {
  const tbody = document.getElementById('tabla-usuarios'); if (!tbody) return;
  tbody.innerHTML = rows.map(u => `<tr><td style="font-weight:600;font-size:.72rem;">${u.nombre}</td><td>${u.zona||'—'}</td><td><span class="badge badge-blue">${u.rol}</span></td><td><span class="badge ${u.activo?'badge-green':'badge-red'}">${u.activo?'Activo':'Inactivo'}</span></td><td><button style="background:none;border:none;cursor:pointer;font-size:.85rem;" onclick="toggleUsuario(${u.id},${u.activo})">${u.activo?'🔒':'🔓'}</button></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);padding:1rem;">Sin usuarios</td></tr>';
}
async function toggleUsuario(id, activo) {
  const u = allUsuarios.find(x=>x.id===id); if (!u) return;
  try { await api('PUT',`/api/usuarios/${id}`,{ ...u, activo:activo?0:1 }); toast(activo?'🔒 Desactivado':'✅ Activado'); loadAdminUsuarios(); }
  catch(e){ toast('❌ '+e.message); }
}
function openModalNuevoUsuario() { document.getElementById('modal-nuevo-usuario').classList.add('open'); }
async function crearUsuario() {
  const dni = document.getElementById('nu-dni').value.trim();
  const nombre = document.getElementById('nu-nombre').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const pass = document.getElementById('nu-pass').value;
  const rol = document.getElementById('nu-rol').value;
  const zona = document.getElementById('nu-zona').value;
  if (!dni||!nombre||!email||!pass) { toast('⚠️ Completa los campos'); return; }
  try { await api('POST','/api/usuarios',{ dni, nombre, email, password:pass, rol, zona, bloque:zona+'-NEW' }); toast('✅ Usuario creado'); closeModal('modal-nuevo-usuario'); ['nu-dni','nu-nombre','nu-email','nu-pass'].forEach(id=>document.getElementById(id).value=''); loadAdminUsuarios(); }
  catch(e){ toast('❌ '+e.message); }
}

async function loadAdminReportes() {
  try {
    const d = await api('GET','/api/dashboard');
    setEl('legend-pre', d.promedioPre+' min'); setEl('legend-post', d.promedioPost+' min');
    setEl('res-pre', d.promedioPre+' min'); setEl('res-post', d.promedioPost+' min');
    setEl('res-red', d.reduccion+'%'); setEl('res-inc', d.incremento+'%'); setEl('res-total', d.totalResiduos);
    const deg = Math.round(d.reduccion*2.2);
    document.getElementById('donut-green')?.setAttribute('stroke-dasharray', `${deg} ${220-deg}`);
    setEl('donut-label', d.reduccion+'%');
    const trend = document.getElementById('admin-trend-chart');
    const labels = document.getElementById('admin-trend-labels');
    if (trend && d.postDias?.length) {
      const maxT = Math.max(...d.postDias.map(r=>r.tiempo), 1);
      trend.innerHTML = d.postDias.map(r => { const h = Math.max(8, Math.round((r.tiempo/maxT)*70)); return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="width:100%;background:var(--g-mid);border-radius:3px 3px 0 0;height:${h}px;"></div><span style="font-size:.5rem;color:var(--text-gray);">${r.tiempo}</span></div>`; }).join('');
      if (labels) labels.innerHTML = d.postDias.map(r=>`<span>${r.fecha}</span>`).join('');
    }
  } catch(e){}
}

let allRegistros = [], regPage = 0; const REG_PER_PAGE = 12;
async function loadAdminRegistros() {
  try { allRegistros = await api('GET','/api/residuos'); regPage=0; renderTablaRegistros(); } catch(e){}
}
function filtrarRegistros() {
  const q = document.getElementById('buscar-registro')?.value.toLowerCase();
  if (!q) { regPage=0; return renderTablaRegistros(); }
  renderTablaRegistros(allRegistros.filter(r => r.nombre?.toLowerCase().includes(q) || r.tipo.includes(q) || r.zona.toLowerCase().includes(q) || r.fecha.includes(q)));
}
function renderTablaRegistros(rows) {
  rows = rows || allRegistros;
  const tbody = document.getElementById('tabla-registros-admin'); if (!tbody) return;
  const page = rows.slice(regPage*REG_PER_PAGE, (regPage+1)*REG_PER_PAGE);
  tbody.innerHTML = page.map(r => `<tr><td>${r.fecha?.slice(5)||r.fecha}</td><td style="font-size:.68rem;">${(r.nombre||'—').split(' ').slice(0,2).join(' ')}</td><td style="text-align:center;font-weight:700;">${r.bolsas}</td><td><span class="badge ${tipoBadge(r.tipo)}">${r.tipo.slice(0,3)}</span></td><td style="font-size:.68rem;">${r.zona}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-gray);">Sin registros</td></tr>';
  const totalPags = Math.ceil(rows.length/REG_PER_PAGE);
  const pag = document.getElementById('reg-paginacion');
  if (pag) pag.innerHTML = Array.from({length:Math.min(totalPags,8)},(_,i)=>`<button onclick="regPage=${i};renderTablaRegistros()" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:${i===regPage?'var(--g-mid)':'white'};color:${i===regPage?'white':'var(--text-gray)'};cursor:pointer;font-size:.78rem;">${i+1}</button>`).join('');
}

let allTiempos = [], tiePage = 0; const TIE_PER_PAGE = 12;
async function loadAdminTiempos() {
  try { allTiempos = await api('GET','/api/tiempos'); tiePage=0; renderTablaTiempos(); } catch(e){}
}
function renderTablaTiempos() {
  const tbody = document.getElementById('tabla-tiempos-admin'); if (!tbody) return;
  const page = allTiempos.slice(tiePage*TIE_PER_PAGE, (tiePage+1)*TIE_PER_PAGE);
  tbody.innerHTML = page.map(r => `<tr><td>${r.fecha?.slice(5)||r.fecha}</td><td style="font-size:.68rem;">${(r.nombre||'—').split(' ').slice(0,2).join(' ')}</td><td style="font-weight:700;">${fmtSec(r.segundos)}</td><td><span class="badge ${r.tipo==='POST'?'badge-green':'badge-yellow'}">${r.tipo}</span></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--text-gray);">Sin tiempos</td></tr>';
  const totalPags = Math.ceil(allTiempos.length/TIE_PER_PAGE);
  const pag = document.getElementById('tie-paginacion');
  if (pag) pag.innerHTML = Array.from({length:Math.min(totalPags,8)},(_,i)=>`<button onclick="tiePage=${i};renderTablaTiempos()" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:${i===tiePage?'var(--g-mid)':'white'};color:${i===tiePage?'white':'var(--text-gray)'};cursor:pointer;font-size:.78rem;">${i+1}</button>`).join('');
}

function openModalNotif() { document.getElementById('modal-notif').classList.add('open'); }
async function enviarNotif() {
  const titulo = document.getElementById('notif-titulo').value.trim();
  const mensaje = document.getElementById('notif-mensaje').value.trim();
  if (!titulo||!mensaje) { toast('⚠️ Completa los campos'); return; }
  try { await api('POST','/api/notificaciones',{ titulo, mensaje }); toast('✅ Notificación enviada'); closeModal('modal-notif'); document.getElementById('notif-titulo').value=''; document.getElementById('notif-mensaje').value=''; loadNotificaciones('notif-admin-list'); }
  catch(e){ toast('❌ '+e.message); }
}

async function loadContactos() {
  const el = document.getElementById('contactos-list'); if (!el) return;
  try {
    const rows = await api('GET','/api/contactos');
    el.innerHTML = rows.length ? rows.map(r => `<div class="card"><div style="font-size:.85rem;font-weight:700;">${r.nombre}</div><div style="font-size:.72rem;color:var(--text-gray);margin-bottom:.4rem;">${r.email} · ${r.created_at?.split(' ')[0]||''}</div><div style="font-size:.8rem;color:var(--text-mid);">${r.mensaje}</div></div>`).join('') : '<div class="empty"><span class="empty-icon">📬</span><span class="empty-text">Sin mensajes aún</span></div>';
  } catch(e){ el.innerHTML = '<div class="empty"><span class="empty-text">Error</span></div>'; }
}

function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function openAdminMenu() { const el = document.getElementById('admin-menu-overlay'); if (el) el.style.display='flex'; }
function closeAdminMenu() { const el = document.getElementById('admin-menu-overlay'); if (el) el.style.display='none'; }

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function tipoIcon(t) { return t==='organico'?'🌿':t==='reciclable'?'♻️':'🗑️'; }
function tipoBadge(t) { return t==='organico'?'badge-green':t==='reciclable'?'badge-blue':'badge-gray'; }
function fmtSec(s) { const m = Math.floor(s/60), sec = s%60; if (m>=60) return `${Math.floor(m/60)}h ${m%60}m`; return `${m}m ${String(sec).padStart(2,'0')}s`; }

document.addEventListener('DOMContentLoaded', () => {
  if (TOKEN && USER) { document.getElementById('splash').style.display='none'; initApp(); }
});
document.querySelectorAll('.modal-overlay').forEach(el => { el.addEventListener('click', function(e){ if (e.target===this) this.classList.remove('open'); }); });
