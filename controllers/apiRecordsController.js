const FuelRecord = require('../models/FuelRecord');
const { summarize } = require('../utils/stats');

exports.list = (req, res) => {
  const records = FuelRecord.findByUser(req.user.id);
  return res.json({ count: records.length, records });
};

exports.getOne = (req, res) => {
  const record = FuelRecord.findById(req.params.id, req.user.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  return res.json({ record });
};

exports.create = (req, res) => {
  try {
    const record = FuelRecord.create(req.user.id, req.body || {});
    return res.status(201).json({ record });
  } catch (err) {
    if (err.code === 'VALIDATION') {
      return res.status(400).json({ error: 'Validation failed', details: err.details });
    }
    return res.status(500).json({ error: 'Internal error' });
  }
};

exports.update = (req, res) => {
  try {
    const updated = FuelRecord.update(req.params.id, req.user.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Record not found' });
    return res.json({ record: updated });
  } catch (err) {
    if (err.code === 'VALIDATION') {
      return res.status(400).json({ error: 'Validation failed', details: err.details });
    }
    return res.status(500).json({ error: 'Internal error' });
  }
};

exports.remove = (req, res) => {
  const ok = FuelRecord.remove(req.params.id, req.user.id);
  if (!ok) return res.status(404).json({ error: 'Record not found' });
  return res.json({ success: true });
};

exports.summary = (req, res) => {
  const records = FuelRecord.findByUser(req.user.id);
  return res.json(summarize(records));
};
