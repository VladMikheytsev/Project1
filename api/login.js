const bcrypt = require('bcryptjs');
const { getPool, getUserTable } = require('./_lib/db');

async function readJsonBody(req) {
  if (req.body) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    const body = await readJsonBody(req);
    const { email, password } = body || {};
    if (!email || !password) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Missing email or password' }));
    }

    const emailNorm = String(email).trim().toLowerCase();

    const pool = getPool();
    const table = await getUserTable(pool);
    let rows;
    if (table === 'users') {
      [rows] = await pool.execute(
        'SELECT `id`, `email`, `password_hash` AS `passwordHash` FROM `users` WHERE `email` = ? LIMIT 1',
        [emailNorm]
      );
    } else {
      [rows] = await pool.execute(
        'SELECT `id`, `email`, `passwordHash`, `role`, `isActive` FROM `'+table+'` WHERE `email` = ? LIMIT 1',
        [emailNorm]
      );
    }
    if (rows.length === 0) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }

    if (table !== 'users') {
      if (user.isActive !== 1 && user.isActive !== true) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: 'User is not active' }));
      }
      return res.end(JSON.stringify({ id: user.id, email: user.email, role: user.role }));
    } else {
      return res.end(JSON.stringify({ id: user.id, email: user.email }));
    }
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};


