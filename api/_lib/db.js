const mysql = require('mysql2/promise');

let pool;
let cachedUserTableName = null;

function getDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://')) return process.env.DATABASE_URL;
  const host = process.env.MYSQLHOST;
  const user = process.env.MYSQLUSER;
  const password = process.env.MYSQLPASSWORD;
  const database = process.env.MYSQLDATABASE;
  const port = process.env.MYSQLPORT || '3306';
  if (host && user && password && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  return null;
}

function getPool() {
  if (!pool) {
    const url = getDatabaseUrl();
    if (!url) {
      throw new Error('DATABASE_URL or Railway MYSQL* envs are not set');
    }
    pool = mysql.createPool(url);
  }
  return pool;
}

async function getUserTable(poolInstance) {
  if (cachedUserTableName) return cachedUserTableName;
  const sql = 'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (\'User\', \'user\', \'users\')';
  const [rows] = await poolInstance.query(sql);
  const names = rows.map(r => r.t);
  if (names.includes('User')) {
    cachedUserTableName = 'User';
  } else if (names.includes('user')) {
    cachedUserTableName = 'user';
  } else if (names.includes('users')) {
    cachedUserTableName = 'users';
  } else {
    cachedUserTableName = 'User';
  }
  return cachedUserTableName;
}

module.exports = { getPool, getUserTable };


