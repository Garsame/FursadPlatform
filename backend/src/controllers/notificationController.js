const Notification = require('../models/Notification');

// @desc    My notifications, newest first
// @route   GET /api/notifications?limit=20&unreadOnly=true
// @access  Private (any signed-in role)
const list = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const query = { recipient: req.user._id };
    if (req.query.unreadOnly === 'true') query.isRead = false;

    const [data, unreadCount, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
      Notification.countDocuments({ recipient: req.user._id })
    ]);

    return res.status(200).json({ success: true, count: data.length, total, unreadCount, data });
  } catch (error) {
    console.error('List Notifications Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Just the badge number
// @route   GET /api/notifications/unread-count
// @access  Private
const unreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Unread Count Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark one as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markRead = async (req, res) => {
  try {
    // Scoped by recipient, so one person cannot mark another's notification.
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Notification not found' });

    const unread = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return res.status(200).json({ success: true, data: updated, unreadCount: unread });
  } catch (error) {
    console.error('Mark Read Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark everything as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ success: true, updated: result.modifiedCount, unreadCount: 0 });
  } catch (error) {
    console.error('Mark All Read Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove one from my list
// @route   DELETE /api/notifications/:id
// @access  Private
const remove = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Notification not found' });

    const unread = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return res.status(200).json({ success: true, unreadCount: unread });
  } catch (error) {
    console.error('Delete Notification Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { list, unreadCount, markRead, markAllRead, remove };
