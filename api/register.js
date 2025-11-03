const bcrypt = require('bcryptjs');
const { getPool } = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    const { email, password, firstName, lastName } = req.body || {};

    if (!email || !password || !firstName || !lastName) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Missing required fields' }));
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid email' }));
    }
    if (String(password).length < 8) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Password must be at least 8 characters' }));
    }

    const pool = getPool();

    // Check existing
    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);
    if (rows.length > 0) {
      res.statusCode = 409;
      return res.end(JSON.stringify({ error: 'User already exists' }));
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [emailNorm, passwordHash, String(firstName).trim(), String(lastName).trim()]
    );

    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ id: result.insertId, email: emailNorm, firstName, lastName }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};


