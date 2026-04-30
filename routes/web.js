const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const recordsController = require('../controllers/recordsController');
const { requireSession, redirectIfAuthed } = require('../middleware/sessionAuth');

router.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  return res.redirect('/login');
});

router.get('/login', redirectIfAuthed, authController.getLogin);
router.post('/login', authController.postLogin);

router.get('/register', redirectIfAuthed, authController.getRegister);
router.post('/register', authController.postRegister);

router.post('/logout', requireSession, authController.postLogout);

router.get('/dashboard', requireSession, recordsController.getDashboard);
router.get('/summary', requireSession, recordsController.getSummary);

router.get('/records/new', requireSession, recordsController.getNew);
router.post('/records', requireSession, recordsController.postCreate);

router.get('/records/:id/edit', requireSession, recordsController.getEdit);
router.post('/records/:id/update', requireSession, recordsController.postUpdate);
router.post('/records/:id/delete', requireSession, recordsController.postDelete);

module.exports = router;
