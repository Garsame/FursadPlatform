const mongoose = require('mongoose');

/**
 * One thing that happened, addressed to one person.
 *
 * Notifications are stored rather than only pushed over the socket, because a
 * person is usually offline when the thing they care about happens. A socket
 * event reaches whoever is connected right now; a record reaches whoever comes
 * back tomorrow.
 *
 * `link` is the point of the whole feature: every notification says where it
 * happened, so opening one lands you on the screen that explains it rather
 * than telling you to go and find it.
 */
const NOTIFICATION_TYPES = [
  // Candidate
  'application_status',   // their application moved through the pipeline
  'new_message',          // someone wrote to them (both sides)
  'chat_accepted',        // the employer opened the conversation
  'job_match',            // a new vacancy scores well against their CV
  'new_employer',         // a company they might suit has started hiring
  'job_closed',           // a job they applied to is no longer open
  // Employer
  'new_application',      // somebody applied to their vacancy
  'job_decision'          // an administrator approved, rejected or withdrew it
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },

    /** In-app route to open. Always a path, never an absolute URL. */
    link: { type: String, default: '' },

    isRead: { type: Boolean, default: false },

    /** Ids for context — which job, which application, which candidate. */
    meta: {
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
      applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      matchScore: { type: Number }
    }
  },
  { timestamps: true }
);

// The only query that matters: this person's newest, unread first.
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
