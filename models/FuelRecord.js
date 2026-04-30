const store = require('./store');

const VALID_TYPES = ['Car', 'Motorcycle'];

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(input) {
  if (!input) return new Date().toISOString().slice(0, 10);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function validate(payload) {
  const errors = [];
  if (!payload.date) errors.push('Date is required');
  if (!VALID_TYPES.includes(payload.vehicleType)) errors.push('Vehicle Type must be Car or Motorcycle');
  if (toNumber(payload.liters) <= 0) errors.push('Liters must be greater than 0');
  if (toNumber(payload.distance) <= 0) errors.push('Distance must be greater than 0');
  if (toNumber(payload.totalCost) < 0) errors.push('Total Cost cannot be negative');
  return errors;
}

const FuelRecord = {
  VALID_TYPES,

  validate,

  findByUser(userId) {
    const data = store.read();
    return data.records
      .filter(r => r.userId === Number(userId))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  },

  findById(id, userId) {
    const data = store.read();
    return data.records.find(r => r.id === Number(id) && r.userId === Number(userId)) || null;
  },

  create(userId, payload) {
    const errors = validate(payload);
    if (errors.length) {
      const err = new Error(errors.join('; '));
      err.code = 'VALIDATION';
      err.details = errors;
      throw err;
    }
    const data = store.read();
    const id = (data.counters.record || 0) + 1;
    data.counters.record = id;
    const record = {
      id,
      userId: Number(userId),
      date: normalizeDate(payload.date),
      vehicleType: payload.vehicleType,
      liters: toNumber(payload.liters),
      distance: toNumber(payload.distance),
      totalCost: toNumber(payload.totalCost),
      createdAt: new Date().toISOString()
    };
    data.records.push(record);
    store.write(data);
    return record;
  },

  update(id, userId, payload) {
    const errors = validate(payload);
    if (errors.length) {
      const err = new Error(errors.join('; '));
      err.code = 'VALIDATION';
      err.details = errors;
      throw err;
    }
    const data = store.read();
    const idx = data.records.findIndex(r => r.id === Number(id) && r.userId === Number(userId));
    if (idx === -1) return null;
    data.records[idx] = {
      ...data.records[idx],
      date: normalizeDate(payload.date),
      vehicleType: payload.vehicleType,
      liters: toNumber(payload.liters),
      distance: toNumber(payload.distance),
      totalCost: toNumber(payload.totalCost),
      updatedAt: new Date().toISOString()
    };
    store.write(data);
    return data.records[idx];
  },

  remove(id, userId) {
    const data = store.read();
    const before = data.records.length;
    data.records = data.records.filter(r => !(r.id === Number(id) && r.userId === Number(userId)));
    const removed = data.records.length !== before;
    if (removed) store.write(data);
    return removed;
  }
};

module.exports = FuelRecord;
