const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { users: [], records: [], counters: { user: 0, record: 0 } };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
}

function read() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = [];
    if (!parsed.records) parsed.records = [];
    if (!parsed.counters) parsed.counters = { user: 0, record: 0 };
    return parsed;
  } catch (err) {
    return { users: [], records: [], counters: { user: 0, record: 0 } };
  }
}

function write(data) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function nextId(kind) {
  const data = read();
  data.counters[kind] = (data.counters[kind] || 0) + 1;
  write(data);
  return data.counters[kind];
}

module.exports = { read, write, nextId };
