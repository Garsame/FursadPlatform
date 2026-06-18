const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Application = require('../models/Application');
const Message = require('../models/Message');

const socketHandler = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fursad_default_secure_secret_key_12345');
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

        // Save message
        const message = await Message.create({
          application: applicationId,
          sender: socket.user._id,
          recipient: recipientId,
          content: content.trim(),
          isRead: false,
          isAutomated: false
        });

        const roomName = `application:${applicationId}`;
        
        // Broadcast message to application conversation room
        io.to(roomName).emit('newMessage', message);

        // Also push notifications to recipient personal room
        io.to(`user:${recipientId}`).emit('notification', {
          type: 'new_message',
          title: `New message from ${socket.user.name}`,
          content: content.slice(0, 50),
          applicationId
        });
      } catch (error) {
        console.error('Socket sendMessage error:', error.message);
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
