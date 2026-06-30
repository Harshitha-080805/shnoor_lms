const socketIo = require('socket.io');
const db = require('./db');
const jwt = require('jsonwebtoken');

let io;

function initSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  // Authentication Middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { userId, role, organization_id }
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.userId}`);

    // Join conversations room
    socket.on('join_rooms', async (conversationIds) => {
      if (Array.isArray(conversationIds)) {
        conversationIds.forEach(id => {
          socket.join(`conversation_${id}`);
        });
        console.log(`User ${socket.user.userId} joined rooms: ${conversationIds.join(', ')}`);
      }
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      // data: { conversationId, message, messageType, attachmentData }
      try {
        const { conversationId, message, messageType, fileUrl, fileName, fileType, replyToId, isForwarded } = data;
        
        // Verify user is member of conversation
        const memberCheck = await db.query(
          'SELECT * FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.user.userId]
        );

        if (memberCheck.rows.length === 0) {
          socket.emit('error', 'Not a member of this conversation');
          return;
        }

        const convCheck = await db.query('SELECT type FROM conversations WHERE id = $1', [conversationId]);
        if (convCheck.rows.length > 0 && convCheck.rows[0].type === 'ANNOUNCEMENT') {
          if (!socket.user.role || socket.user.role.toUpperCase() !== 'ADMIN') {
            socket.emit('error', 'Only Super Admins can send messages here');
            return;
          }
        }

        // Insert message
        const result = await db.query(
          'INSERT INTO messages (conversation_id, sender_id, message, message_type, reply_to_id, is_forwarded) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [conversationId, socket.user.userId, message || '', messageType || 'TEXT', replyToId || null, isForwarded || false]
        );

        const newMessage = result.rows[0];

        // Fetch sender name
        const userRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [socket.user.userId]);
        if (userRes.rows.length > 0) {
          newMessage.sender_name = userRes.rows[0].full_name || userRes.rows[0].email;
        }

        if (fileUrl) {
          await db.query(
            'INSERT INTO message_attachments (message_id, file_url, file_type, file_name) VALUES ($1, $2, $3, $4)',
            [newMessage.id, fileUrl, fileType || 'UNKNOWN', fileName || '']
          );
          newMessage.file_url = fileUrl;
          newMessage.file_name = fileName;
        }

        // Emit to room
        io.to(`conversation_${conversationId}`).emit('receive_message', newMessage);

      } catch (err) {
        console.error('Socket send_message error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.userId}`);
    });
  });
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = { initSocket, getIo };
