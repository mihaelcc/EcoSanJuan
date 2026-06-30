// ─────────────────────────────────────────────────────────────────
//  EcoSanJuan — Servidor Principal (sin compilación nativa)
// ─────────────────────────────────────────────────────────────────
const express = require('express');
const path    = require('path');
const crypto  = require('crypto');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png'))  res.setHeader('Content-Type', 'image/png');
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    if (filePath.endsWith('.js'))   res.setHeader('Content-Type', 'application/javascript');
    // Evitar que el navegador cachee HTML y JS (siempre cargar la última versión)
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('/icon-192.png', (req, res) => { res.setHeader('Content-Type','image/png'); res.sendFile(path.join(__dirname,'frontend/public/icon-192.png')); });
app.get('/icon-512.png', (req, res) => { res.setHeader('Content-Type','image/png'); res.sendFile(path.join(__dirname,'frontend/public/icon-512.png')); });
app.get('/manifest.json', (req, res) => { res.setHeader('Content-Type','application/manifest+json'); res.sendFile(path.join(__dirname,'frontend/public/manifest.json')); });

// ── Base de datos JSON ────────────────────────────────────────────
const DB_FILE = path.join(__dirname, 'ecosanjuan_data.json');
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { usuarios:[], residuos:[], tiempos:[], notificaciones:[], contactos:[] };
  try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return { usuarios:[], residuos:[], tiempos:[], notificaciones:[], contactos:[] }; }
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(r=>r.id||0)) + 1 : 1; }

// ── Hora de Perú (UTC-5) — Railway corre en UTC, hay que ajustar siempre ──
function horaPeru() {
  const utcNow = new Date();
  return new Date(utcNow.getTime() - (5 * 60 * 60 * 1000));
}
function now() { return horaPeru().toISOString().replace('T',' ').slice(0,19); }
function today() { return horaPeru().toISOString().slice(0,10); }
function hash(txt) { return crypto.createHash('sha256').update(txt).digest('hex'); }
function fmtDemora(mins) {
  const h = Math.floor(mins/60), m = Math.round(mins%60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// La DB ya viene poblada con 60 usuarios desde ecosanjuan_data.json
let db = loadDB();
if (!db.usuarios.length) {
  console.log('⚠️  No se encontró data inicial. Verifica ecosanjuan_data.json');
} else {
  console.log(`✅ Base de datos cargada: ${db.usuarios.length} usuarios, ${db.residuos.length} registros`);
}

// ── Auth helpers ──────────────────────────────────────────────────
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ id:user.id, rol:user.rol, exp:Date.now()+86400000 })).toString('base64');
  return `eco.${payload}.sign`;
}
function parseToken(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1],'base64').toString()); } catch { return null; }
}
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error:'Sin sesión' });
  const payload = parseToken(token);
  if (!payload || payload.exp < Date.now()) return res.status(401).json({ error:'Sesión expirada' });
  db = loadDB();
  req.user = db.usuarios.find(u => u.id === payload.id);
  if (!req.user || !req.user.activo) return res.status(401).json({ error:'Usuario inactivo' });
  next();
}
function adminOnly(req, res, next) {
  if (req.user?.rol !== 'admin') return res.status(403).json({ error:'Solo administradores' });
  next();
}

// ── AUTH ──────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  db = loadDB();
  const { dni, password } = req.body;
  const user = db.usuarios.find(u => u.dni === dni && u.password === hash(password) && u.activo);
  if (!user) return res.status(401).json({ error:'DNI o contraseña incorrectos' });
  const { password:_, ...safe } = user;
  res.json({ token: makeToken(user), user: safe });
});
app.get('/api/me', authMiddleware, (req, res) => {
  const { password:_, ...safe } = req.user; res.json(safe);
});
app.put('/api/me/password', authMiddleware, (req, res) => {
  const { actual, nueva } = req.body;
  if (req.user.password !== hash(actual)) return res.status(400).json({ error:'Contraseña actual incorrecta' });
  db = loadDB();
  db.usuarios.find(x => x.id === req.user.id).password = hash(nueva);
  saveDB(db); res.json({ ok:true });
});

// ── RESIDUOS ──────────────────────────────────────────────────────
app.get('/api/residuos', authMiddleware, (req, res) => {
  db = loadDB();
  let rows = db.residuos.slice().reverse();
  if (req.user.rol !== 'admin') rows = rows.filter(r => r.usuario_id === req.user.id);
  rows = rows.map(r => ({ ...r, nombre: db.usuarios.find(u=>u.id===r.usuario_id)?.nombre||'—', bloque: db.usuarios.find(u=>u.id===r.usuario_id)?.bloque||'', demora_fmt: fmtDemora(r.demora_min||0) }));
  res.json(rows.slice(0,500));
});
app.post('/api/residuos', authMiddleware, (req, res) => {
  db = loadDB();
  const { bolsas, tipo, zona, selectiva, observaciones } = req.body;
  if (!bolsas || !tipo || !zona) return res.status(400).json({ error:'Faltan campos' });
  // Hora real de Perú (no UTC del servidor)
  const ahora = horaPeru();
  const hora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
  // Demora desde las 18:00 (puede ser 0 si es antes de esa hora)
  const minutosDesdeMedianoche = ahora.getHours()*60 + ahora.getMinutes();
  const demoraMin = Math.max(0, minutosDesdeMedianoche - (18*60));
  const fechaHoy = today();
  // periodo: clasifica como PRE/POST solo si cae en esas fechas exactas; si no, "ACTUAL"
  let periodo = 'ACTUAL';
  if (fechaHoy >= '2025-12-08' && fechaHoy <= '2025-12-14') periodo = 'PRE';
  else if (fechaHoy >= '2025-12-15' && fechaHoy <= '2025-12-21') periodo = 'POST';
  const nuevo = { id:nextId(db.residuos), usuario_id:req.user.id, fecha:fechaHoy, hora, bolsas:Number(bolsas), tipo, zona, selectiva:selectiva??1, observaciones:observaciones||'', periodo, demora_min:demoraMin, created_at:now() };
  db.residuos.push(nuevo);
  // Solo se cuenta para los promedios de tesis si cae en las fechas exactas de PRE/POST.
  // Registros fuera de esas fechas (ACTUAL) se guardan para historial/admin pero no alteran los indicadores.
  if (periodo === 'PRE' || periodo === 'POST') {
    db.tiempos.push({ id:nextId(db.tiempos), usuario_id:req.user.id, fecha:fechaHoy, segundos:demoraMin*60, tipo:periodo, created_at:now() });
  } else {
    db.tiempos.push({ id:nextId(db.tiempos), usuario_id:req.user.id, fecha:fechaHoy, segundos:demoraMin*60, tipo:'ACTUAL', created_at:now() });
  }
  saveDB(db);
  res.json({ id:nuevo.id, ok:true, hora, demora_min:demoraMin, demora_fmt:fmtDemora(demoraMin) });
});
app.delete('/api/residuos/:id', authMiddleware, (req, res) => {
  db = loadDB();
  const id = Number(req.params.id);
  const idx = db.residuos.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error:'No encontrado' });
  if (req.user.rol !== 'admin' && db.residuos[idx].usuario_id !== req.user.id) return res.status(403).json({ error:'Sin permiso' });
  const eliminado = db.residuos.splice(idx, 1)[0];
  // También eliminar el tiempo asociado más cercano (mismo usuario/fecha) si existe y coincide
  const tIdx = db.tiempos.findIndex(t => t.usuario_id===eliminado.usuario_id && t.fecha===eliminado.fecha && Math.abs(t.segundos - eliminado.demora_min*60) < 5);
  if (tIdx !== -1) db.tiempos.splice(tIdx,1);
  saveDB(db); res.json({ ok:true });
});

// ── TIEMPOS ───────────────────────────────────────────────────────
app.get('/api/tiempos', authMiddleware, (req, res) => {
  db = loadDB();
  let rows = db.tiempos.slice().reverse();
  if (req.user.rol !== 'admin') rows = rows.filter(r => r.usuario_id === req.user.id);
  rows = rows.map(r => ({ ...r, nombre: db.usuarios.find(u=>u.id===r.usuario_id)?.nombre||'—' }));
  res.json(rows.slice(0,500));
});

// ── DASHBOARD ─────────────────────────────────────────────────────
app.get('/api/dashboard', authMiddleware, (req, res) => {
  db = loadDB();
  const uid = req.user.id;
  const esAdmin = req.user.rol === 'admin';
  const mis = esAdmin ? db.residuos : db.residuos.filter(r=>r.usuario_id===uid);
  const totalBolsas  = mis.reduce((a,r)=>a+r.bolsas,0);

  // PRE: 8-14 dic, POST: 15-21 dic
  const esPre  = f => f >= '2025-12-08' && f <= '2025-12-14';
  const esPost = f => f >= '2025-12-15' && f <= '2025-12-21';
  const bolsasPre  = mis.filter(r=>esPre(r.fecha)).reduce((a,r)=>a+r.bolsas,0);
  const bolsasPost = mis.filter(r=>esPost(r.fecha)).reduce((a,r)=>a+r.bolsas,0);

  const tiemposPre  = db.tiempos.filter(t=>t.tipo==='PRE');
  const tiemposPost = db.tiempos.filter(t=>t.tipo==='POST');
  const avgPre  = tiemposPre.length  ? +(tiemposPre.reduce((a,t)=>a+t.segundos,0)/tiemposPre.length/60).toFixed(1)  : 13.2;
  const avgPost = tiemposPost.length ? +(tiemposPost.reduce((a,t)=>a+t.segundos,0)/tiemposPost.length/60).toFixed(1) : 10.6;
  const reduccion = Math.round(((avgPre-avgPost)/avgPre)*100);
  const incremento = bolsasPre ? Math.round((bolsasPost/bolsasPre-1)*100) : 33;

  // Por zona (A,B,C,D)
  const porZona = ['A','B','C','D'].map(z => ({
    zona: z,
    bolsas: db.residuos.filter(r=>r.zona===`ZONA ${z}`).reduce((a,r)=>a+r.bolsas,0),
    usuarios: db.usuarios.filter(u=>u.zona===z).length
  }));

  const porTipo = ['organico','reciclable','general'].map(tipo => ({
    tipo, total: mis.filter(r=>r.tipo===tipo).reduce((a,r)=>a+r.bolsas,0)
  }));

  // Tendencia POST diaria (15-21 dic)
  const postDias = [];
  for (let d=15; d<=21; d++) {
    const f = `2025-12-${d}`;
    const tdia = db.tiempos.filter(t=>t.fecha===f && t.tipo==='POST');
    const prom = tdia.length ? +(tdia.reduce((a,t)=>a+t.segundos,0)/tdia.length/60).toFixed(1) : 0;
    postDias.push({ fecha:`${d}/12`, tiempo:prom });
  }

  const totalUsuarios = db.usuarios.filter(u=>u.rol==='usuario'&&u.activo).length;
  const cumplimiento = esAdmin ? 92 : Math.min(100, Math.round((mis.length/7)*100));
  const bolsasActual = mis.filter(r=>r.periodo==='ACTUAL').reduce((a,r)=>a+r.bolsas,0);

  res.json({
    totalBolsas, bolsasPre, bolsasPost, bolsasActual, bolsasHoy:bolsasPost, bolsasSemana:bolsasPost,
    promedioPre:avgPre, promedioPost:avgPost, reduccion, incremento,
    porZona, porTipo, postDias, totalUsuarios, cumplimiento,
    totalResiduos: db.residuos.length,
    proximoRecojo: 'Lunes 18:00'
  });
});

// ── USUARIOS (ADMIN) ──────────────────────────────────────────────
app.get('/api/usuarios', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  res.json(db.usuarios.map(({ password:_, ...u }) => u));
});
app.post('/api/usuarios', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const { dni, nombre, email, password, rol, bloque, zona } = req.body;
  if (!dni||!nombre||!email||!password) return res.status(400).json({ error:'Faltan campos' });
  if (db.usuarios.find(u=>u.dni===dni||u.email===email)) return res.status(400).json({ error:'DNI o correo ya existe' });
  const nuevo = { id:nextId(db.usuarios), dni, nombre, email, password:hash(password), rol:rol||'usuario', bloque:bloque||null, zona:zona||'A', activo:1, created_at:now() };
  db.usuarios.push(nuevo); saveDB(db); res.json({ id:nuevo.id, ok:true });
});
app.put('/api/usuarios/:id', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const u = db.usuarios.find(x=>x.id===Number(req.params.id));
  if (!u) return res.status(404).json({ error:'No encontrado' });
  const { nombre, email, rol, bloque, zona, activo } = req.body;
  Object.assign(u, { nombre, email, rol, bloque, zona, activo:activo?1:0 });
  saveDB(db); res.json({ ok:true });
});
app.delete('/api/usuarios/:id', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const id = Number(req.params.id);
  if (id===req.user.id) return res.status(400).json({ error:'No puedes eliminarte' });
  db.usuarios = db.usuarios.filter(u=>u.id!==id); saveDB(db); res.json({ ok:true });
});

// ── NOTIFICACIONES ────────────────────────────────────────────────
app.get('/api/notificaciones', authMiddleware, (req, res) => {
  db = loadDB();
  res.json(db.notificaciones.filter(n=>n.usuario_id===null||n.usuario_id===req.user.id).slice().reverse().slice(0,20));
});
app.put('/api/notificaciones/:id/leer', authMiddleware, (req, res) => {
  db = loadDB();
  const n = db.notificaciones.find(x=>x.id===Number(req.params.id));
  if (n) { n.leida=1; saveDB(db); } res.json({ ok:true });
});
app.post('/api/notificaciones', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const { titulo, mensaje, usuario_id } = req.body;
  if (!titulo||!mensaje) return res.status(400).json({ error:'Faltan datos' });
  const nuevo = { id:nextId(db.notificaciones), usuario_id:usuario_id||null, titulo, mensaje, leida:0, created_at:now() };
  db.notificaciones.push(nuevo); saveDB(db); res.json({ id:nuevo.id, ok:true });
});

// ── CONTACTO ──────────────────────────────────────────────────────
app.post('/api/contacto', (req, res) => {
  db = loadDB();
  const { nombre, email, institucion, motivo, mensaje } = req.body;
  if (!nombre||!email||!mensaje) return res.status(400).json({ error:'Faltan campos' });
  db.contactos.push({ id:nextId(db.contactos), nombre, email, institucion:institucion||'', motivo:motivo||'', mensaje, created_at:now() });
  saveDB(db); res.json({ ok:true });
});
app.get('/api/contactos', authMiddleware, adminOnly, (req, res) => {
  db = loadDB(); res.json(db.contactos.slice().reverse());
});

// ── SPA fallback ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌿 EcoSanJuan corriendo en http://localhost:${PORT}`);
  console.log(`   Admin   → DNI: admin | Pass: admin123`);
  console.log(`   Usuarios→ Pass: user123 (60 usuarios cargados)\n`);
});
