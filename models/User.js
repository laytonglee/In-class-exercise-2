const bcrypt = require('bcryptjs');
const store = require('./store');

const User = {
  findByUsername(username) {
    const data = store.read();
    return data.users.find(u => u.username.toLowerCase() === String(username).toLowerCase()) || null;
  },

  findById(id) {
    const data = store.read();
    return data.users.find(u => u.id === Number(id)) || null;
  },

  async create({ username, password }) {
    const existing = this.findByUsername(username);
    if (existing) {
      const err = new Error('Username already taken');
      err.code = 'USER_EXISTS';
      throw err;
    }
    const hash = await bcrypt.hash(password, 10);
    const data = store.read();
    const id = (data.counters.user || 0) + 1;
    data.counters.user = id;
    const user = {
      id,
      username,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    store.write(data);
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  },

  async verifyPassword(username, password) {
    const user = this.findByUsername(username);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, username: user.username };
  }
};

module.exports = User;
