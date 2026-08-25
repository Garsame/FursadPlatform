/**
 * Holds the Socket.IO server so code outside the socket layer can push to it.
 *
 * Controllers and services need to notify people, but they are reached over
 * HTTP and have no reference to the socket server. Passing `io` down through
 * every call would thread it through a dozen signatures that otherwise have
 * nothing to do with sockets.
 *
 * Nothing here throws when the server is absent: a missing socket means live
 * delivery is skipped, not that the request fails. The notification is still
 * written to the database and will be there on next load.
 */
let io = null;

const setIo = (instance) => { io = instance; };

/** Pushes an event into one user's personal room. Silent when offline. */
const toUser = (userId, event, payload) => {
  if (!io || !userId) return false;
  io.to(`user:${userId}`).emit(event, payload);
  return true;
};

module.exports = { setIo, toUser, getIo: () => io };
