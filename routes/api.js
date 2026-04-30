const express = require('express');
const router = express.Router();

const apiAuth = require('../controllers/apiAuthController');
const apiRecords = require('../controllers/apiRecordsController');
const { requireJwt } = require('../middleware/jwtAuth');

router.get('/', (req, res) => {
  res.json({
    name: 'Fuel Consumption Manager API',
    version: '1.0.0',
    auth: 'Cookie-based: JWT in httpOnly \'token\' cookie + CSRF double-submit \'csrf-token\' cookie',
    endpoints: {
      'POST /api/register': 'Create account — sets token (httpOnly) + csrf-token cookies',
      'POST /api/login':    'Authenticate — sets token (httpOnly) + csrf-token cookies',
      'POST /api/logout':   'Clear auth cookies',
      'GET  /api/me':       'Current user (JWT cookie required)',
      'GET  /api/records':           'List my fuel records (JWT cookie required)',
      'POST /api/records':           'Create a record (JWT + X-CSRF-Token header required)',
      'GET  /api/records/:id':       'Get a single record (JWT cookie required)',
      'PUT  /api/records/:id':       'Update a record (JWT + X-CSRF-Token header required)',
      'DELETE /api/records/:id':     'Delete a record (JWT + X-CSRF-Token header required)',
      'GET  /api/summary':           'Weekly + monthly aggregates (JWT cookie required)'
    }
  });
});

router.post('/register', apiAuth.register);
router.post('/login', apiAuth.login);
router.post('/logout', apiAuth.logout);

router.get('/me', requireJwt, apiAuth.me);

router.get('/records', requireJwt, apiRecords.list);
router.post('/records', requireJwt, apiRecords.create);
router.get('/records/:id', requireJwt, apiRecords.getOne);
router.put('/records/:id', requireJwt, apiRecords.update);
router.delete('/records/:id', requireJwt, apiRecords.remove);

router.get('/summary', requireJwt, apiRecords.summary);

module.exports = router;
