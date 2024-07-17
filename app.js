// app.js
const express = require('express');
const session = require('express-session');
const pool = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
}));

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

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

app.get('/recetas', isAuthenticated, (req, res) => {
  res.render('recetas');
});

app.post('/recetas', isAuthenticated, async (req, res) => {
  const { startDate, endDate, sucursal } = req.body;
  const result = await pool.query(`
    SELECT * FROM recetas 
    WHERE fechacreacion BETWEEN $1 AND $2 AND sucursales = $3
  `, [startDate, endDate, sucursal]);

  const recetas = result.rows;
  const txtContent = recetas.map(r => JSON.stringify(r)).join('\n');

  res.setHeader('Content-disposition', 'attachment; filename=Codigos.txt');
  res.setHeader('Content-type', 'text/plain');
  res.write(txtContent, () => {
    res.end();
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
