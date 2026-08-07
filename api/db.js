const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

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

module.exports = {
  getUsers() {
    const d = readFile();
    return d.users || [];
  },
  saveUsers(users) {
    const d = readFile();
    d.users = users;
    writeFile(d);
  },
  getPoems() {
    const d = readFile();
    return d.poems || [];
  },
  savePoems(poems) {
    const d = readFile();
    d.poems = poems;
    writeFile(d);
  }
};
