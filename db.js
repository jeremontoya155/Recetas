// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TDXQSEjHNRoHGqlQmcuNuSClWoUlUujB@viaduct.proxy.rlwy.net:45221/railway'
});

module.exports = pool;
