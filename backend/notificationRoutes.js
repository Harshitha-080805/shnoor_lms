const express = require('express');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    req.user = { id: decoded.userId, ...decoded }; // Map userId to id for compatibility
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
// Create a notification helper (can be used internally by other routes)
const createNotification = async (userId, title, message, type, link = null) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, title, message, type, link];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get notifications for the logged-in user (Super Admins might have user_id = null or their specific ID)
// Since this phase is for Super Admins, if they are fetching, we fetch their notifications.
// If user_id is null in DB it means global, but let's assume Super Admins are also in users table.
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // For now, super admin gets notifications where user_id = userId OR user_id IS NULL
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    // Optional: Check if notification belongs to user
    const checkQuery = `SELECT * FROM notifications WHERE id = $1`;
    const { rows: notifRows } = await pool.query(checkQuery, [notificationId]);
    if (notifRows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const query = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [notificationId]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = $1 OR user_id IS NULL
      RETURNING *
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

module.exports = {
  router,
  createNotification
};
