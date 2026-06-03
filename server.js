// ─────────────────────────────────────────────────────────────────
//  EcoSanJuan — Servidor Principal
//  Node.js + Express + nedb-promises (sin compilación nativa)
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
  }
}));

// Rutas explícitas para íconos PWA
app.get('/icon-192.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.join(__dirname, 'frontend/public/icon-192.png'));
});
app.get('/icon-512.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.join(__dirname, 'frontend/public/icon-512.png'));
});
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'frontend/public/manifest.json'));
});

// ── Base de datos JSON simple (sin dependencias nativas) ──────────
const DB_FILE = path.join(__dirname, 'ecosanjuan_data.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { usuarios:[], residuos:[], tiempos:[], notificaciones:[], contactos:[] };
  try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return { usuarios:[], residuos:[], tiempos:[], notificaciones:[], contactos:[] }; }
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(r=>r.id||0)) + 1 : 1; }
function now() { return new Date().toISOString().replace('T',' ').slice(0,19); }
function today() { return new Date().toISOString().slice(0,10); }
function time() { return new Date().toTimeString().slice(0,8); }

function hash(txt) { return crypto.createHash('sha256').update(txt).digest('hex'); }

// ── Seed inicial ──────────────────────────────────────────────────
let db = loadDB();

if (!db.usuarios.length) {
  db.usuarios = [
    { id:1, dni:'admin',    nombre:'Administrador',     email:'admincondominio@gmail.com', password:hash('admin123'), rol:'admin',   bloque:null, activo:1, created_at:now() },
    { id:2, dni:'71433258', nombre:'Micaela Hernández', email:'mica.hernandez@gmail.com',  password:hash('user123'),  rol:'usuario', bloque:'B-03', activo:1, created_at:now() },
    { id:3, dni:'71433259', nombre:'Carlos Pérez',      email:'carlos.perez@gmail.com',    password:hash('user123'),  rol:'usuario', bloque:'A-01', activo:1, created_at:now() },
    { id:4, dni:'71433260', nombre:'Ana Torres',        email:'ana.torres@gmail.com',      password:hash('user123'),  rol:'usuario', bloque:'C-12', activo:1, created_at:now() },
    { id:5, dni:'71433261', nombre:'Luis Mamani',       email:'luis.mamani@gmail.com',     password:hash('user123'),  rol:'usuario', bloque:'D-05', activo:1, created_at:now() },
    { id:6, dni:'71433262', nombre:'Rosa Quispe',       email:'rosa.quispe@gmail.com',     password:hash('user123'),  rol:'usuario', bloque:'B-10', activo:1, created_at:now() },
  ];
  db.residuos = [
    { id:1, usuario_id:2, fecha:'2025-11-07', hora:'18:10', bolsas:2, tipo:'organico',   zona:'BLOQUE A',  selectiva:1, observaciones:'Residuos de cocina', created_at:now() },
    { id:2, usuario_id:3, fecha:'2025-11-07', hora:'17:55', bolsas:1, tipo:'reciclable', zona:'ACOPIO 56', selectiva:1, observaciones:'Botellas de plástico', created_at:now() },
    { id:3, usuario_id:4, fecha:'2025-11-06', hora:'18:05', bolsas:3, tipo:'general',    zona:'BLOQUE B',  selectiva:0, observaciones:'Desmonte pequeño', created_at:now() },
    { id:4, usuario_id:2, fecha:'2025-11-06', hora:'18:15', bolsas:1, tipo:'reciclable', zona:'ACOPIO 56', selectiva:1, observaciones:'', created_at:now() },
    { id:5, usuario_id:5, fecha:'2025-11-05', hora:'18:00', bolsas:2, tipo:'organico',   zona:'BLOQUE A',  selectiva:1, observaciones:'', created_at:now() },
    { id:6, usuario_id:6, fecha:'2025-11-04', hora:'18:20', bolsas:1, tipo:'reciclable', zona:'ACOPIO 56', selectiva:1, observaciones:'Cartones', created_at:now() },
    { id:7, usuario_id:3, fecha:'2025-11-03', hora:'17:50', bolsas:2, tipo:'general',    zona:'BLOQUE B',  selectiva:0, observaciones:'', created_at:now() },
    { id:8, usuario_id:4, fecha:'2025-11-02', hora:'18:05', bolsas:1, tipo:'organico',   zona:'BLOQUE A',  selectiva:1, observaciones:'', created_at:now() },
  ];
  db.tiempos = [
    { id:1, usuario_id:2, fecha:'2025-10-01', segundos:798, tipo:'PRE', created_at:now() },
    { id:2, usuario_id:3, fecha:'2025-10-01', segundos:810, tipo:'PRE', created_at:now() },
    { id:3, usuario_id:4, fecha:'2025-10-01', segundos:780, tipo:'PRE', created_at:now() },
    { id:4, usuario_id:5, fecha:'2025-10-01', segundos:828, tipo:'PRE', created_at:now() },
    { id:5, usuario_id:6, fecha:'2025-10-01', segundos:792, tipo:'PRE', created_at:now() },
    { id:6, usuario_id:2, fecha:'2025-11-07', segundos:654, tipo:'POST', created_at:now() },
    { id:7, usuario_id:3, fecha:'2025-11-07', segundos:642, tipo:'POST', created_at:now() },
    { id:8, usuario_id:4, fecha:'2025-11-06', segundos:618, tipo:'POST', created_at:now() },
    { id:9, usuario_id:5, fecha:'2025-11-05', segundos:660, tipo:'POST', created_at:now() },
    { id:10,usuario_id:6, fecha:'2025-11-04', segundos:636, tipo:'POST', created_at:now() },
  ];
  db.notificaciones = [
    { id:1, usuario_id:null, titulo:'🚛 Recojo mañana', mensaje:'El recojo es mañana lunes a las 18:00. Prepara tus bolsas.', leida:0, created_at:now() },
    { id:2, usuario_id:null, titulo:'♻️ Semana de Reciclaje', mensaje:'Esta semana hay punto de acopio especial en ACOPIO 56.', leida:0, created_at:now() },
  ];
  db.contactos = [];
  saveDB(db);
  console.log('✅ Base de datos inicializada con datos de muestra');
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

// ── API AUTH ──────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  db = loadDB();
  const { dni, password } = req.body;
  const user = db.usuarios.find(u => u.dni === dni && u.password === hash(password) && u.activo);
  if (!user) return res.status(401).json({ error:'DNI o contraseña incorrectos' });
  const { password:_, ...safe } = user;
  res.json({ token: makeToken(user), user: safe });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const { password:_, ...safe } = req.user;
  res.json(safe);
});

app.put('/api/me/password', authMiddleware, (req, res) => {
  const { actual, nueva } = req.body;
  if (req.user.password !== hash(actual)) return res.status(400).json({ error:'Contraseña actual incorrecta' });
  db = loadDB();
  const u = db.usuarios.find(x => x.id === req.user.id);
  u.password = hash(nueva);
  saveDB(db);
  res.json({ ok:true });
});

// ── API RESIDUOS ──────────────────────────────────────────────────
app.get('/api/residuos', authMiddleware, (req, res) => {
  db = loadDB();
  let rows = db.residuos.slice().reverse();
  if (req.user.rol !== 'admin') rows = rows.filter(r => r.usuario_id === req.user.id);
  rows = rows.map(r => ({ ...r, nombre: db.usuarios.find(u=>u.id===r.usuario_id)?.nombre||'—', bloque: db.usuarios.find(u=>u.id===r.usuario_id)?.bloque||'' }));
  res.json(rows.slice(0,200));
});

app.post('/api/residuos', authMiddleware, (req, res) => {
  db = loadDB();
  const { bolsas, tipo, zona, selectiva, observaciones } = req.body;
  if (!bolsas || !tipo || !zona) return res.status(400).json({ error:'Faltan campos' });
  const nuevo = { id:nextId(db.residuos), usuario_id:req.user.id, fecha:today(), hora:time().slice(0,5), bolsas:Number(bolsas), tipo, zona, selectiva:selectiva??1, observaciones:observaciones||'', created_at:now() };
  db.residuos.push(nuevo);
  saveDB(db);
  res.json({ id:nuevo.id, ok:true });
});

app.delete('/api/residuos/:id', authMiddleware, (req, res) => {
  db = loadDB();
  const id = Number(req.params.id);
  const idx = db.residuos.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error:'No encontrado' });
  if (req.user.rol !== 'admin' && db.residuos[idx].usuario_id !== req.user.id) return res.status(403).json({ error:'Sin permiso' });
  db.residuos.splice(idx, 1);
  saveDB(db);
  res.json({ ok:true });
});

// ── API TIEMPOS ───────────────────────────────────────────────────
app.get('/api/tiempos', authMiddleware, (req, res) => {
  db = loadDB();
  let rows = db.tiempos.slice().reverse();
  if (req.user.rol !== 'admin') rows = rows.filter(r => r.usuario_id === req.user.id);
  rows = rows.map(r => ({ ...r, nombre: db.usuarios.find(u=>u.id===r.usuario_id)?.nombre||'—' }));
  res.json(rows.slice(0,200));
});

app.post('/api/tiempos', authMiddleware, (req, res) => {
  db = loadDB();
  const { segundos } = req.body;
  if (!segundos) return res.status(400).json({ error:'Faltan datos' });
  const nuevo = { id:nextId(db.tiempos), usuario_id:req.user.id, fecha:today(), segundos:Number(segundos), tipo:'POST', created_at:now() };
  db.tiempos.push(nuevo);
  saveDB(db);
  res.json({ id:nuevo.id, ok:true });
});

// ── API DASHBOARD ─────────────────────────────────────────────────
app.get('/api/dashboard', authMiddleware, (req, res) => {
  db = loadDB();
  const uid = req.user.id;
  const esAdmin = req.user.rol === 'admin';

  const todayStr = today();
  const lunesStr = (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); })();

  const mis = esAdmin ? db.residuos : db.residuos.filter(r=>r.usuario_id===uid);
  const totalBolsas   = mis.reduce((a,r)=>a+r.bolsas,0);
  const bolsasHoy     = mis.filter(r=>r.fecha===todayStr).reduce((a,r)=>a+r.bolsas,0);
  const bolsasSemana  = mis.filter(r=>r.fecha>=lunesStr).reduce((a,r)=>a+r.bolsas,0);

  const pre  = db.tiempos.filter(t=>t.tipo==='PRE');
  const post = db.tiempos.filter(t=>t.tipo==='POST');
  const avgPre  = pre.length  ? +(pre.reduce((a,t)=>a+t.segundos,0)/pre.length/60).toFixed(1)  : 13.3;
  const avgPost = post.length ? +(post.reduce((a,t)=>a+t.segundos,0)/post.length/60).toFixed(1) : 10.6;
  const reduccion = pre.length && post.length ? Math.round(((avgPre-avgPost)/avgPre)*100) : 20;

  // Últimos 7 días
  const ultimos7 = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const f = d.toISOString().slice(0,10);
    const bolsas = db.residuos.filter(r=>r.fecha===f).reduce((a,r)=>a+r.bolsas,0);
    ultimos7.push({ fecha:f.slice(5), bolsas });
  }

  // Por tipo
  const porTipo = ['organico','reciclable','general'].map(tipo => ({
    tipo, total: mis.filter(r=>r.tipo===tipo).reduce((a,r)=>a+r.bolsas,0)
  }));

  const totalUsuarios = db.usuarios.filter(u=>u.rol==='usuario'&&u.activo).length;

  const diasReg = new Set(mis.filter(r=>r.fecha>=lunesStr).map(r=>r.fecha)).size;
  const cumplimiento = Math.min(100, Math.round((diasReg/7)*100));

  const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const ahora=new Date(); const dia=ahora.getDay();
  const recojos=[1,3,5]; let prox=recojos.find(d=>d>dia)||recojos[0];
  const diff = prox>dia ? prox-dia : 7-dia+prox;
  const pf=new Date(ahora); pf.setDate(ahora.getDate()+diff);
  const proximoRecojo=`${dias[pf.getDay()]} ${pf.getDate()}/${String(pf.getMonth()+1).padStart(2,'0')} 18:00`;

  res.json({ totalBolsas,bolsasHoy,bolsasSemana,promedioPre:avgPre,promedioPost:avgPost,reduccion,ultimos7,porTipo,totalUsuarios,cumplimiento,proximoRecojo });
});

// ── API USUARIOS (ADMIN) ──────────────────────────────────────────
app.get('/api/usuarios', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  res.json(db.usuarios.map(({ password:_, ...u }) => u));
});

app.post('/api/usuarios', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const { dni, nombre, email, password, rol, bloque } = req.body;
  if (!dni||!nombre||!email||!password) return res.status(400).json({ error:'Faltan campos' });
  if (db.usuarios.find(u=>u.dni===dni||u.email===email)) return res.status(400).json({ error:'DNI o correo ya existe' });
  const nuevo = { id:nextId(db.usuarios), dni, nombre, email, password:hash(password), rol:rol||'usuario', bloque:bloque||null, activo:1, created_at:now() };
  db.usuarios.push(nuevo);
  saveDB(db);
  res.json({ id:nuevo.id, ok:true });
});

app.put('/api/usuarios/:id', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const u = db.usuarios.find(x=>x.id===Number(req.params.id));
  if (!u) return res.status(404).json({ error:'No encontrado' });
  const { nombre, email, rol, bloque, activo } = req.body;
  Object.assign(u, { nombre, email, rol, bloque, activo:activo?1:0 });
  saveDB(db);
  res.json({ ok:true });
});

app.delete('/api/usuarios/:id', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const id = Number(req.params.id);
  if (id===req.user.id) return res.status(400).json({ error:'No puedes eliminarte' });
  db.usuarios = db.usuarios.filter(u=>u.id!==id);
  saveDB(db);
  res.json({ ok:true });
});

// ── API NOTIFICACIONES ────────────────────────────────────────────
app.get('/api/notificaciones', authMiddleware, (req, res) => {
  db = loadDB();
  const rows = db.notificaciones.filter(n=>n.usuario_id===null||n.usuario_id===req.user.id).slice().reverse().slice(0,20);
  res.json(rows);
});

app.put('/api/notificaciones/:id/leer', authMiddleware, (req, res) => {
  db = loadDB();
  const n = db.notificaciones.find(x=>x.id===Number(req.params.id));
  if (n) { n.leida=1; saveDB(db); }
  res.json({ ok:true });
});

app.post('/api/notificaciones', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  const { titulo, mensaje, usuario_id } = req.body;
  if (!titulo||!mensaje) return res.status(400).json({ error:'Faltan datos' });
  const nuevo = { id:nextId(db.notificaciones), usuario_id:usuario_id||null, titulo, mensaje, leida:0, created_at:now() };
  db.notificaciones.push(nuevo);
  saveDB(db);
  res.json({ id:nuevo.id, ok:true });
});

// ── API CONTACTO ──────────────────────────────────────────────────
app.post('/api/contacto', (req, res) => {
  db = loadDB();
  const { nombre, email, institucion, motivo, mensaje } = req.body;
  if (!nombre||!email||!mensaje) return res.status(400).json({ error:'Faltan campos' });
  db.contactos.push({ id:nextId(db.contactos), nombre, email, institucion:institucion||'', motivo:motivo||'', mensaje, created_at:now() });
  saveDB(db);
  res.json({ ok:true });
});

app.get('/api/contactos', authMiddleware, adminOnly, (req, res) => {
  db = loadDB();
  res.json(db.contactos.slice().reverse());
});

// ── SPA fallback ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌿 EcoSanJuan corriendo en http://localhost:${PORT}`);
  console.log(`   Admin  → DNI: admin     | Pass: admin123`);
  console.log(`   Usuario→ DNI: 71433258  | Pass: user123\n`);
});
