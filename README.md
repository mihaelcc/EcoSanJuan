# 🌿 EcoSanJuan — Aplicativo Web Completo

**Aplicativo móvil para la optimización de la gestión y monitoreo de residuos sólidos**  
San Juan de Miraflores, Lima, 2026 — Universidad Autónoma del Perú

---

## 🚀 Cómo ejecutarlo (paso a paso)

### Requisitos previos
- **Node.js** v18 o superior → https://nodejs.org (descargar LTS)
- Una terminal (CMD en Windows, Terminal en Mac/Linux)

---

### 1. Instalar dependencias

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto instalará:
- `express` — Servidor web
- `better-sqlite3` — Base de datos SQLite
- `cors` — Permisos de acceso

---

### 2. Iniciar el servidor

```bash
npm start
```

Verás en la terminal:
```
🌿 EcoSanJuan corriendo en http://localhost:3000
   Admin: DNI=admin  / Pass=admin123
   Usuario: DNI=71433258 / Pass=user123
```

---

### 3. Abrir la aplicación

**En el navegador del computador:**
```
http://localhost:3000
```

**En el celular** (misma red WiFi):
1. En la terminal, busca la IP de tu PC (ejecuta `ipconfig` en Windows o `ifconfig` en Mac)
2. En el celular abre: `http://TU_IP:3000`
3. En Chrome/Safari → menú → "Agregar a pantalla de inicio" → ¡queda como app!

---

## 👤 Credenciales de acceso

| Perfil | DNI | Contraseña |
|--------|-----|------------|
| Administrador | `admin` | `admin123` |
| Micaela Hernández | `71433258` | `user123` |
| Carlos Pérez | `71433259` | `user123` |
| Ana Torres | `71433260` | `user123` |
| Luis Mamani | `71433261` | `user123` |
| Rosa Quispe | `71433262` | `user123` |

---

## 📱 Funcionalidades implementadas

### Perfil Usuario
- ✅ Pantalla de splash y login
- ✅ Dashboard con bolsas del día / semana / índice de cumplimiento
- ✅ Registrar bolsas (tipo, cantidad, zona, observaciones)
- ✅ Control de tiempo (cronómetro + guardar en BD)
- ✅ Calendario de recolección
- ✅ Puntos de recojo en mapa
- ✅ Reportes PRE vs POST
- ✅ Perfil con estadísticas propias
- ✅ Notificaciones
- ✅ Cambiar contraseña

### Perfil Administrador
- ✅ Panel de control con métricas PRE/POST
- ✅ Gestión de usuarios (crear, activar/desactivar)
- ✅ Reportes y análisis con gráficos
- ✅ Registro de todos los residuos
- ✅ Control de tiempos de todos los usuarios
- ✅ Menú lateral deslizable
- ✅ Enviar notificaciones a todos
- ✅ Ver mensajes de contacto

---

## 🗄️ Base de datos

Se crea automáticamente el archivo `ecosanjuan.db` al iniciar el servidor.

**Tablas:**
- `usuarios` — Datos de acceso y perfil
- `residuos` — Registros de bolsas por usuario
- `tiempos` — Tiempos de disposición (PRE/POST)
- `notificaciones` — Alertas del sistema
- `contactos` — Mensajes del formulario web

---

## ☁️ Despliegue en internet (hosting gratuito)

### Opción A — Railway.app (recomendado, gratis)
1. Crea cuenta en https://railway.app
2. Sube el proyecto a GitHub
3. En Railway: "New Project" → "Deploy from GitHub"
4. Listo — te da una URL pública

### Opción B — Render.com (gratis)
1. Sube a GitHub
2. En Render: "New Web Service" → conecta tu repo
3. Build command: `npm install`
4. Start command: `npm start`

### Opción C — VPS / Servidor propio
```bash
# Instalar PM2 para mantener el servidor siempre activo
npm install -g pm2
pm2 start server.js --name ecosanjuan
pm2 startup   # Para que arranque al reiniciar
```

---

## 📁 Estructura del proyecto

```
ecosanjuan/
├── server.js              ← Servidor Node.js + API REST
├── package.json           ← Dependencias
├── ecosanjuan.db          ← Base de datos (se crea automático)
├── README.md              ← Este archivo
└── frontend/
    └── public/
        ├── index.html     ← App completa (SPA)
        ├── manifest.json  ← Config PWA
        └── js/
            └── app.js     ← Toda la lógica del frontend
```

---

## 🛠️ API REST disponible

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Iniciar sesión |
| GET | `/api/me` | Mis datos |
| GET | `/api/residuos` | Listar residuos |
| POST | `/api/residuos` | Registrar residuo |
| GET | `/api/tiempos` | Listar tiempos |
| POST | `/api/tiempos` | Guardar tiempo |
| GET | `/api/dashboard` | Métricas generales |
| GET | `/api/usuarios` | Listar usuarios (admin) |
| POST | `/api/usuarios` | Crear usuario (admin) |
| GET | `/api/notificaciones` | Mis notificaciones |
| POST | `/api/notificaciones` | Enviar notif (admin) |
| POST | `/api/contacto` | Enviar mensaje |

---

*Tesis: "Aplicativo Móvil para la Optimización de la Gestión y Monitoreo de Residuos Sólidos en San Juan de Miraflores – Lima, 2026"*  
*Autoras: Araujo Jayo, Kemily J. · Vilcapuma Chuquispuma, Pamela A.*  
*Asesor: Vidal Rischmoller, Julio César*
