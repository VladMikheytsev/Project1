const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
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
    const { email, password, firstName, lastName } = body || {};

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
    const table = await getUserTable(pool);

    const [rows] = await pool.execute(`SELECT \`id\` FROM \`${table}\` WHERE \`email\` = ? LIMIT 1`, [emailNorm]);
    if (rows.length > 0) {
      res.statusCode = 409;
      return res.end(JSON.stringify({ error: 'User already exists' }));
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    if (table === 'users') {
      const sql = 'INSERT INTO `users` (`email`,`password_hash`,`first_name`,`last_name`) VALUES (?,?,?,?)';
      try {
        const [result] = await pool.execute(sql, [
          emailNorm,
          passwordHash,
          String(firstName).trim(),
          String(lastName).trim()
        ]);
        return res.end(JSON.stringify({ id: result.insertId, email: emailNorm }));
      } catch (e) {
        if (e && e.code === 'ER_DUP_ENTRY') {
          res.statusCode = 409;
          return res.end(JSON.stringify({ error: 'Email already in use' }));
        }
        throw e;
      }
    } else {
      const id = nanoid();
      const sql = 'INSERT INTO `'+table+'` (`id`,`email`,`passwordHash`,`role`,`isActive`,`mustChangePassword`,`resetToken`,`resetTokenExpiresAt`,`createdAt`,`updatedAt`) VALUES (?,?,?,?,?,?,?, ?, NOW(), NOW())';
      try {
        await pool.execute(sql, [
          id,
          emailNorm,
          passwordHash,
          'USER',
          1,
          0,
          null,
          null
        ]);
        return res.end(JSON.stringify({ id, email: emailNorm, role: 'USER' }));
      } catch (e) {
        if (e && e.code === 'ER_DUP_ENTRY') {
          res.statusCode = 409;
          return res.end(JSON.stringify({ error: 'Email already in use' }));
        }
        throw e;
      }
    }
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};


