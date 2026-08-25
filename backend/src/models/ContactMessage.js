const mongoose = require('mongoose');

/**
 * A message from the public contact form.
 *
 * These used to be emailed and nothing else, so the only record was in one
 * inbox: nobody could tell what had already been answered, two people could
 * reply to the same enquiry, and a failed send lost the message entirely.
 * Storing them makes the queue visible and the handling accountable.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new',
      index: true
    },

    /** Who picked it up, and any note they left for whoever reads it next. */
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null },
    adminNote: { type: String, trim: true, default: '' },

    /** Whether the copy to the platform inbox actually left the building. */
    emailDelivered: { type: Boolean, default: false },

    /** Set when the sender already has an account, so context is one click away. */
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
