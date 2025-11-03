const bcrypt = require('bcryptjs');
const { getPool } = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Missing email or password' }));
    }

    const emailNorm = String(email).trim().toLowerCase();

    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ? LIMIT 1',
      [emailNorm]
    );
    if (rows.length === 0) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }

    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};


