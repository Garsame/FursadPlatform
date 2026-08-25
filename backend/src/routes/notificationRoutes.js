const express = require('express');
const router = express.Router();
const {
  list, unreadCount, markRead, markAllRead, remove
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Every role has notifications, so this is gated on being signed in and
// nothing more. Each query is scoped to req.user, so there is nothing to
// authorise beyond identity.
router.use(protect);

router.get('/', list);
router.get('/unread-count', unreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', remove);

module.exports = router;
