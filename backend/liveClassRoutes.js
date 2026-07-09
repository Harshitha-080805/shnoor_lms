const express = require('express');
const pool = require('./db');

module.exports = (authMiddleware) => {
  const router = express.Router();

  // Create a new live class (Instructor or Institute)
  router.post('/', authMiddleware(), async (req, res) => {
    try {
      const { course_id, title, description, meeting_provider, meeting_link, start_datetime, end_datetime } = req.body;
      const user = req.user;

      if (user.role !== 'INSTRUCTOR' && user.role !== 'ORGANIZATION_ADMIN') {
        return res.status(403).json({ error: 'Only instructors or institutes can create live classes.' });
      }

      const instructor_id = user.role === 'INSTRUCTOR' ? user.userId : null;
      
      // Determine organization_id
      let organization_id = user.organization_id || null;

      const result = await pool.query(
        `INSERT INTO live_classes 
         (course_id, instructor_id, organization_id, title, description, meeting_provider, meeting_link, start_datetime, end_datetime, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Upcoming') RETURNING *`,
        [course_id, instructor_id, organization_id, title, description, meeting_provider, meeting_link, start_datetime, end_datetime]
      );

      // Create notification for all students enrolled in the course
      try {
        const enrollments = await pool.query('SELECT student_id FROM enrollments WHERE course_id = $1', [course_id]);
        for (let row of enrollments.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
            [row.student_id, 'New Live Class Scheduled', `A new live class "${title}" has been scheduled.`, 'LIVE_CLASS', '/student-dashboard/live-classes']
          );
        }
      } catch (e) {
        console.error("Error creating notifications for live class:", e);
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error creating live class.' });
    }
  });

  // Get live classes
  router.get('/', authMiddleware(), async (req, res) => {
    try {
      const user = req.user;
      let query = `
        SELECT lc.*, c.title as course_title, u.full_name as instructor_name 
        FROM live_classes lc
        LEFT JOIN courses c ON lc.course_id = c.id
        LEFT JOIN users u ON lc.instructor_id = u.id
      `;
      let params = [];

      if (user.role === 'LEARNER') {
        // Students only see live classes for their enrolled courses
        query += ` WHERE lc.course_id IN (SELECT course_id FROM enrollments WHERE student_id = $1) ORDER BY lc.start_datetime ASC`;
        params.push(user.userId);
      } else if (user.role === 'INSTRUCTOR') {
        query += ` WHERE lc.instructor_id = $1 OR c.instructor_id = $1 ORDER BY lc.start_datetime ASC`;
        params.push(user.userId);
      } else if (user.role === 'ORGANIZATION_ADMIN') {
        query += ` WHERE lc.organization_id = $1 OR c.organization_id = $1 ORDER BY lc.start_datetime ASC`;
        params.push(user.organization_id);
      } else if (user.role === 'admin' || user.role === 'super_admin') {
        query += ` ORDER BY lc.start_datetime DESC`;
      } else {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching live classes.' });
    }
  });

  // Get specific live class
  router.get('/:id', authMiddleware(), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT lc.*, c.title as course_title 
        FROM live_classes lc
        LEFT JOIN courses c ON lc.course_id = c.id
        WHERE lc.id = $1
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Live class not found.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching live class.' });
    }
  });

  // Update a live class
  router.put('/:id', authMiddleware(), async (req, res) => {
    try {
      const { title, description, meeting_provider, meeting_link, start_datetime, end_datetime, recording_link, status } = req.body;
      const user = req.user;

      if (user.role !== 'INSTRUCTOR' && user.role !== 'ORGANIZATION_ADMIN' && user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      const result = await pool.query(
        `UPDATE live_classes 
         SET title = $1, description = $2, meeting_provider = $3, meeting_link = $4, start_datetime = $5, end_datetime = $6, recording_link = $7, status = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 RETURNING *`,
        [title, description, meeting_provider, meeting_link, start_datetime, end_datetime, recording_link, status, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Live class not found.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error updating live class.' });
    }
  });

  // Delete a live class
  router.delete('/:id', authMiddleware(), async (req, res) => {
    try {
      const user = req.user;

      if (user.role !== 'INSTRUCTOR' && user.role !== 'ORGANIZATION_ADMIN' && user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      const result = await pool.query('DELETE FROM live_classes WHERE id = $1 RETURNING *', [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Live class not found.' });
      }
      res.json({ message: 'Live class deleted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error deleting live class.' });
    }
  });

  return router;
};
