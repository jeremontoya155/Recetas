require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pool = require('./db');
const pgSession = require('connect-pg-simple')(session);

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Para manejar solicitudes JSON

// Middleware para servir archivos estáticos
app.use(express.static('public'));

app.use(session({
  store: new pgSession({
    pool: pool,                // Conexión de la base de datos
    tableName: 'session'       // Nombre de la tabla de sesiones
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 días
}));

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Ruta de inicio
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Rutas
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
  const user = result.rows[0];

  if (user) {
    req.session.user = user;
    res.redirect('/recetas');
  } else {
    res.send('Username or password incorrect');
  }
});

// Ruta para obtener las sucursales únicas
app.get('/sucursales', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT sucursales FROM recetas');
    const sucursales = result.rows.map(row => parseInt(row.sucursales, 10)).sort((a, b) => a - b);
    res.json(sucursales);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las sucursales');
  }
});

app.get('/recetas', isAuthenticated, (req, res) => {
  res.render('recetas');
});

app.post('/recetas', isAuthenticated, async (req, res) => {
  const { startDate, endDate, sucursal } = req.body;
  let query = 'SELECT numero FROM recetas WHERE fechacreacion BETWEEN $1 AND $2';
  const params = [startDate, endDate];

  if (sucursal && sucursal !== 'all') {
    query += ' AND sucursales = $3';
    params.push(sucursal);
  }

  const result = await pool.query(query, params);

  const numeros = result.rows.map(r => r.numero);
  const txtContent = numeros.join('\n');

  res.setHeader('Content-disposition', 'attachment; filename=Codigos.txt');
  res.setHeader('Content-type', 'text/plain');
  res.write(txtContent, () => {
    res.end();
  });
});

// Nueva ruta para obtener la cantidad de recetas en un rango de fechas y sucursal específica
app.post('/recetas-count', isAuthenticated, async (req, res) => {
  const { startDate, endDate, sucursal } = req.body;
  let query = 'SELECT COUNT(*) FROM recetas WHERE fechacreacion BETWEEN $1 AND $2';
  const params = [startDate, endDate];

  if (sucursal && sucursal !== 'all') {
    query += ' AND sucursales = $3';
    params.push(sucursal);
  }

  try {
    const result = await pool.query(query, params);
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener la cantidad de recetas');
  }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send('Error al cerrar la sesión');
    }
    res.redirect('/login');
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

