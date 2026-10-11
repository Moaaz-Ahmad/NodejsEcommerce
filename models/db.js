const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // set in .env (not committed)
  database: process.env.DB_NAME || 'node-complete',
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true, // only used for schema.sql below; queries elsewhere are parameterized
});

pool.init = async () => {
  await pool.query(await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
};

module.exports = pool;
