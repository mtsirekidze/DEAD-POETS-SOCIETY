const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const DATABASE_URL = process.env.DATABASE_URL || '';
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
let schemaInitialized = false;

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function isHashedPassword(password) {
  return typeof password === 'string' && /^[a-f0-9]{64}$/.test(password);
}

function readFile() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], poems: [] };
  }
}

function writeFile(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getLocalData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production.');
  }
  return readFile();
}

async function requirePool() {
  if (!pool) {
    throw new Error('DATABASE_URL is required in production.');
  }
  await ensureSchema();
  return pool;
}

async function ensureSchema() {
  if (!pool || schemaInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      bio TEXT,
      picture TEXT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS poems (
      id BIGINT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      mood TEXT,
      excerpt TEXT,
      description TEXT,
      lines JSONB NOT NULL,
      likes INT DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL
    );
  `);
  schemaInitialized = true;
}

function parseUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    password: row.password,
    bio: row.bio || '',
    picture: row.picture || ''
  };
}

function parsePoem(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    author: row.author,
    mood: row.mood || '',
    excerpt: row.excerpt || '',
    description: row.description || '',
    lines: Array.isArray(row.lines) ? row.lines : JSON.parse(row.lines || '[]'),
    likes: Number(row.likes || 0),
    createdAt: row.createdAt ? (typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString()) : null
  };
}

module.exports = {
  hashPassword,
  async getUsers() {
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT id,name,email,password,bio,picture FROM users ORDER BY id');
      return res.rows.map(parseUser);
    }
    return getLocalData().users || [];
  },
  async findUserByEmail(email) {
    const normalized = String(email || '').toLowerCase();
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT id,name,email,password,bio,picture FROM users WHERE email = $1 LIMIT 1', [normalized]);
      return parseUser(res.rows[0]);
    }
    return (getLocalData().users || []).find((user) => user.email === normalized) || null;
  },
  async getUserById(id) {
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT id,name,email,password,bio,picture FROM users WHERE id = $1 LIMIT 1', [id]);
      return parseUser(res.rows[0]);
    }
    return (getLocalData().users || []).find((user) => Number(user.id) === Number(id)) || null;
  },
  async createUser(user) {
    const password = isHashedPassword(user.password) ? user.password : hashPassword(user.password);
    const userToSave = Object.assign({}, user, { email: String(user.email).toLowerCase(), password });
    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        'INSERT INTO users(id,name,email,password,bio,picture) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,password,bio,picture',
        [userToSave.id, userToSave.name, userToSave.email, userToSave.password, userToSave.bio || '', userToSave.picture || '']
      );
      return parseUser(res.rows[0]);
    }
    const data = getLocalData();
    data.users = data.users || [];
    data.users.push(userToSave);
    writeFile(data);
    return userToSave;
  },
  async updateUser(id, fields) {
    if (fields.password) {
      fields.password = isHashedPassword(fields.password) ? fields.password : hashPassword(fields.password);
    }
    if (pool) {
      await ensureSchema();
      const updates = [];
      const values = [];
      let index = 1;
      for (const key of ['name', 'email', 'password', 'bio', 'picture']) {
        if (fields[key] !== undefined) {
          updates.push(`"${key}" = $${index}`);
          values.push(key === 'email' ? String(fields[key]).toLowerCase() : fields[key]);
          index += 1;
        }
      }
      if (!updates.length) return this.getUserById(id);
      values.push(id);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${index} RETURNING id,name,email,password,bio,picture`;
      const res = await pool.query(query, values);
      return parseUser(res.rows[0]);
    }
    const data = readFile();
    const users = data.users || [];
    const idx = users.findIndex((user) => Number(user.id) === Number(id));
    if (idx === -1) return null;
    users[idx] = Object.assign({}, users[idx], fields);
    writeFile(data);
    return users[idx];
  },
  async getPoems() {
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT id,title,author,mood,excerpt,description,lines,likes,"createdAt" FROM poems ORDER BY "createdAt" DESC');
      return res.rows.map(parsePoem);
    }
    return getLocalData().poems || [];
  },
  async createPoem(poem) {
    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        'INSERT INTO poems(id,title,author,mood,excerpt,description,lines,likes,"createdAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,title,author,mood,excerpt,description,lines,likes,"createdAt"',
        [poem.id, poem.title, poem.author, poem.mood, poem.excerpt, poem.description, JSON.stringify(poem.lines || []), poem.likes || 0, poem.createdAt]
      );
      return parsePoem(res.rows[0]);
    }
    const data = getLocalData();
    data.poems = data.poems || [];
    data.poems.unshift(poem);
    writeFile(data);
    return poem;
  },
  async updatePoemLikes(id, likes) {
    if (pool) {
      await ensureSchema();
      const res = await pool.query('UPDATE poems SET likes = $1 WHERE id = $2 RETURNING id,title,author,mood,excerpt,description,lines,likes,"createdAt"', [likes, id]);
      return parsePoem(res.rows[0]);
    }
    const data = getLocalData();
    const poem = (data.poems || []).find((p) => Number(p.id) === Number(id));
    if (!poem) return null;
    poem.likes = likes;
    writeFile(data);
    return poem;
  },
  async deletePoem(id) {
    if (pool) {
      await ensureSchema();
      await pool.query('DELETE FROM poems WHERE id = $1', [id]);
      return true;
    }
    const data = getLocalData();
    const poems = data.poems || [];
    const idx = poems.findIndex((p) => Number(p.id) === Number(id));
    if (idx === -1) return false;
    poems.splice(idx, 1);
    data.poems = poems;
    writeFile(data);
    return true;
  },
  async updatePoemAuthors(oldName, newName) {
    if (pool) {
      await ensureSchema();
      await pool.query('UPDATE poems SET author = $1 WHERE author = $2', [newName, oldName]);
      return true;
    }
    const data = getLocalData();
    (data.poems || []).forEach((poem) => {
      if (poem.author === oldName) poem.author = newName;
    });
    writeFile(data);
    return true;
  }
};
