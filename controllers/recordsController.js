const FuelRecord = require('../models/FuelRecord');
const { summarize } = require('../utils/stats');

function decorate(records) {
  return records.map(r => ({
    ...r,
    kmPerLiter: r.liters > 0 ? Math.round((r.distance / r.liters) * 100) / 100 : 0,
    costPerKm: r.distance > 0 ? Math.round((r.totalCost / r.distance) * 100) / 100 : 0
  }));
}

exports.getDashboard = (req, res) => {
  const records = FuelRecord.findByUser(req.session.user.id);
  const stats = summarize(records);
  const flash = req.session.flash || null;
  req.session.flash = null;
  res.render('dashboard', {
    title: 'Dashboard',
    csrfToken: req.csrfToken && req.csrfToken(),
    records: decorate(records),
    stats,
    flash
  });
};

exports.getSummary = (req, res) => {
  const records = FuelRecord.findByUser(req.session.user.id);
  const stats = summarize(records);
  res.render('summary', {
    title: 'Summary',
    stats
  });
};

exports.getNew = (req, res) => {
  res.render('add-record', {
    title: 'Add Fuel Record',
    csrfToken: req.csrfToken && req.csrfToken(),
    types: FuelRecord.VALID_TYPES,
    today: new Date().toISOString().slice(0, 10)
  });
};

exports.postCreate = (req, res) => {
  try {
    FuelRecord.create(req.session.user.id, req.body);
    req.session.flash = { type: 'success', message: 'Fuel record added.' };
    req.session.save(() => res.redirect('/dashboard'));
  } catch (err) {
    return res.status(400).render('add-record', {
      title: 'Add Fuel Record',
      csrfToken: req.csrfToken && req.csrfToken(),
      types: FuelRecord.VALID_TYPES,
      error: err.message,
      values: req.body,
      today: new Date().toISOString().slice(0, 10)
    });
  }
};

exports.getEdit = (req, res) => {
  const record = FuelRecord.findById(req.params.id, req.session.user.id);
  if (!record) {
    req.session.flash = { type: 'error', message: 'Record not found.' };
    return req.session.save(() => res.redirect('/dashboard'));
  }
  res.render('edit-record', {
    title: 'Edit Fuel Record',
    csrfToken: req.csrfToken && req.csrfToken(),
    types: FuelRecord.VALID_TYPES,
    record
  });
};

exports.postUpdate = (req, res) => {
  try {
    const updated = FuelRecord.update(req.params.id, req.session.user.id, req.body);
    if (!updated) {
      req.session.flash = { type: 'error', message: 'Record not found.' };
      return req.session.save(() => res.redirect('/dashboard'));
    }
    req.session.flash = { type: 'success', message: 'Record updated.' };
    req.session.save(() => res.redirect('/dashboard'));
  } catch (err) {
    return res.status(400).render('edit-record', {
      title: 'Edit Fuel Record',
      csrfToken: req.csrfToken && req.csrfToken(),
      types: FuelRecord.VALID_TYPES,
      record: { id: req.params.id, ...req.body },
      error: err.message
    });
  }
};

exports.postDelete = (req, res) => {
  const ok = FuelRecord.remove(req.params.id, req.session.user.id);
  req.session.flash = ok
    ? { type: 'success', message: 'Record deleted.' }
    : { type: 'error', message: 'Record not found.' };
  req.session.save(() => res.redirect('/dashboard'));
};
