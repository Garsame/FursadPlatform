const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Application = require('../models/Application');
const Message = require('../models/Message');
const { JWT_SECRET } = require('../config/secrets');
const notificationService = require('../services/notificationService');
const Job = require('../models/Job');

/**
 * How much of the conversation is open, from the application's own record.
 * Both portals render from this, so neither has to reimplement the rule.
 */
const conversationState = async (application) => {
  const accepted = !!application.messaging?.acceptedAt;
  const openersSent = accepted
    ? 0
    : await Message.countDocuments({
        application: application._id,
        sender: application.jobseeker,
        isAutomated: false
      });

  return {
    applicationId: String(application._id),
    accepted,
    acceptedAt: application.messaging?.acceptedAt || null,
    // What the candidate's side is allowed to do right now.
    candidateCanSend: accepted || openersSent === 0,
    candidateOpenerUsed: !accepted && openersSent > 0
  };
};

const socketHandler = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Authentication error: User suspended'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected to Socket.IO: ${socket.user.name} (${socket.user.role})`);

    // Join personal room for system notifications
    socket.join(`user:${socket.user._id}`);

    // Client joins application conversation
    socket.on('joinApplication', async (applicationId) => {
      try {
        const application = await Application.findById(applicationId).populate('job');
        if (!application) {
          return socket.emit('errorMsg', { message: 'Application not found' });
        }

        // Verify authorization
        const isJobseeker = application.jobseeker.toString() === socket.user._id.toString();
        const isEmployer = application.job.postedBy.toString() === socket.user._id.toString();

        if (!isJobseeker && !isEmployer) {
          return socket.emit('errorMsg', { message: 'Unauthorized access to this conversation' });
        }

        const roomName = `application:${applicationId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.user.name} joined room: ${roomName}`);

        // Fetch previous messages and send to client
        const messages = await Message.find({ application: applicationId })
          .sort({ createdAt: 1 })
          .limit(100);

        socket.emit('previousMessages', messages);
        socket.emit('conversationState', await conversationState(application));
      } catch (error) {
        console.error('Socket joinApplication error:', error.message);
        socket.emit('errorMsg', { message: error.message });
      }
    });

    // Client sends message
    socket.on('sendMessage', async ({ applicationId, recipientId, content }) => {
      try {
        if (!content || content.trim() === '') {
          return;
        }

        const application = await Application.findById(applicationId).populate('job');
        if (!application) {
          return socket.emit('errorMsg', { message: 'Application not found' });
        }

        // Verify user is candidate or employer
        const isJobseeker = application.jobseeker.toString() === socket.user._id.toString();
        const isEmployer = application.job.postedBy.toString() === socket.user._id.toString();

        if (!isJobseeker && !isEmployer) {
          return socket.emit('errorMsg', { message: 'Unauthorized to send message' });
        }

        // The gate. Checked here because this is the only place a message can
        // actually be created — a disabled input in the browser is a courtesy,
        // not a rule.
        if (isJobseeker) {
          const state = await conversationState(application);
          if (!state.candidateCanSend) {
            return socket.emit('messageBlocked', {
              applicationId: String(applicationId),
              message: 'Your introduction has been sent. You can carry on once the employer accepts it.'
            });
          }
        }

        // Save message
        const message = await Message.create({
          application: applicationId,
          sender: socket.user._id,
          recipient: recipientId,
          content: content.trim(),
          isRead: false,
          isAutomated: false
        });

        // An employer typing a genuine reply is acceptance — asking them to
        // also press a button to permit the answer they just wrote would be
        // pure ceremony. Automated status emails never open the thread.
        if (isEmployer && !application.messaging?.acceptedAt) {
          application.messaging = { acceptedAt: new Date(), acceptedBy: socket.user._id };
          await application.save();
          io.to(`application:${applicationId}`).emit('conversationState', await conversationState(application));
        }

        const roomName = `application:${applicationId}`;
        
        // Broadcast message to application conversation room
        io.to(roomName).emit('newMessage', message);

        // A stored notification rather than a transient event: the person it
        // is for is usually not connected at the moment it is sent, and an
        // event nobody is listening to simply disappears.
        const forEmployer = isJobseeker;
        await notificationService.notify({
          recipient: recipientId,
          type: 'new_message',
          title: `New message from ${socket.user.name}`,
          body: content.trim().slice(0, 140),
          link: forEmployer
            ? `/provider/messages?job=${application.job._id}&application=${applicationId}`
            : `/dashboard/messages?application=${applicationId}`,
          meta: { applicationId, jobId: application.job._id, actorId: socket.user._id }
        });
      } catch (error) {
        console.error('Socket sendMessage error:', error.message);
        socket.emit('errorMsg', { message: error.message });
      }
    });

    // Employer opens the thread to the candidate.
    socket.on('acceptConversation', async (applicationId) => {
      try {
        const application = await Application.findById(applicationId).populate('job');
        if (!application) {
          return socket.emit('errorMsg', { message: 'Application not found' });
        }

        // Only the employer who owns the vacancy may accept.
        if (application.job.postedBy.toString() !== socket.user._id.toString()) {
          return socket.emit('errorMsg', { message: 'Only the employer can accept this conversation' });
        }

        if (!application.messaging?.acceptedAt) {
          application.messaging = { acceptedAt: new Date(), acceptedBy: socket.user._id };
          await application.save();
        }

        const state = await conversationState(application);
        io.to(`application:${applicationId}`).emit('conversationState', state);

        // The candidate may not have the thread open — tell them anyway.
        await notificationService.notify({
          recipient: application.jobseeker,
          type: 'chat_accepted',
          title: `${socket.user.name} accepted your message`,
          body: 'You can carry on the conversation now.',
          link: `/dashboard/messages?application=${applicationId}`,
          meta: { applicationId, jobId: application.job?._id, actorId: socket.user._id }
        });
      } catch (error) {
        console.error('Socket acceptConversation error:', error.message);
        socket.emit('errorMsg', { message: error.message });
      }
    });

    // Client marks messages as read
    socket.on('markRead', async (applicationId) => {
      try {
        await Message.updateMany(
          { application: applicationId, recipient: socket.user._id, isRead: false },
          { $set: { isRead: true } }
        );

        io.to(`application:${applicationId}`).emit('messagesRead', { by: socket.user._id });
      } catch (error) {
        console.error('Socket markRead error:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from Socket.IO: ${socket.user.name}`);
    });
  });
};

module.exports = socketHandler;
