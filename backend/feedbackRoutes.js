const express = require('express');
const router = express.Router();
const pool = require('./db');
const { createNotification } = require('./notificationRoutes');
module.exports = function(authMiddleware) {

// Note: verifyToken middleware is assumed to put the user info in req.user
// Assuming req.user has { id, role, organization_id }

// ============================================
// COURSE FEEDBACK
// ============================================
router.post('/course', authMiddleware(), async (req, res) => {
  const { course_id, rating, review, is_anonymous } = req.body;
  const student_id = (req.user.userId || req.user.id);

  try {
    const result = await pool.query(
      `INSERT INTO course_feedback (course_id, student_id, rating, review, is_anonymous)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [course_id, student_id, rating, review, is_anonymous || false]
    );

    // Notify the instructor of the course
    const courseRes = await pool.query('SELECT instructor_id, title FROM courses WHERE id = $1', [course_id]);
    if (courseRes.rows.length > 0) {
      const instructorId = courseRes.rows[0].instructor_id;
      const courseTitle = courseRes.rows[0].title;
      await createNotification(
        instructorId, 
        'New Course Feedback', 
        `You received a new ${rating}-star feedback for your course "${courseTitle}".`, 
        'COURSE_FEEDBACK', 
        '/instructor-dashboard'
      );
    }

    res.status(201).json({ message: 'Course feedback submitted successfully.', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'You have already submitted feedback for this course.' });
    }
    console.error('Error submitting course feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if user has already submitted feedback for a course
router.get('/course/check/:courseId', authMiddleware(), async (req, res) => {
  const { courseId } = req.params;
  const student_id = (req.user.userId || req.user.id);
  
  try {
    const result = await pool.query(
      'SELECT id FROM course_feedback WHERE course_id = $1 AND student_id = $2',
      [courseId, student_id]
    );
    res.json({ hasSubmitted: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking course feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/course/instructor/:instructorId', authMiddleware(), async (req, res) => {
  let { instructorId } = req.params;
  if (instructorId === 'me') instructorId = req.user.userId || req.user.id;
  try {
    const result = await pool.query(`
      SELECT cf.*, c.title as course_title, 
        CASE WHEN cf.is_anonymous THEN 'Anonymous' ELSE u.full_name END as student_name
      FROM course_feedback cf
      JOIN courses c ON cf.course_id = c.id
      LEFT JOIN users u ON cf.student_id = u.id
      WHERE c.instructor_id = $1
      ORDER BY cf.created_at DESC
    `, [instructorId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching course feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get course feedback for an organization
router.get('/course/org/me', authMiddleware(), async (req, res) => {
  const orgId = req.user.organization_id || req.user.userId || req.user.id;
  try {
    const result = await pool.query(`
      SELECT cf.*, c.title as course_title, 
        CASE WHEN cf.is_anonymous THEN 'Anonymous' ELSE u.full_name END as student_name
      FROM course_feedback cf
      JOIN courses c ON cf.course_id = c.id
      JOIN users inst ON c.instructor_id = inst.id
      LEFT JOIN users u ON cf.student_id = u.id
      WHERE inst.organization_id = $1
      ORDER BY cf.created_at DESC
    `, [orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching org course feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================
// INSTRUCTOR FEEDBACK
// ============================================
router.post('/instructor', authMiddleware(), async (req, res) => {
  const { instructor_id, course_id, teaching_rating, knowledge_rating, communication_rating, review } = req.body;
  const student_id = (req.user.userId || req.user.id);
  const overall_rating = (teaching_rating + knowledge_rating + communication_rating) / 3.0;

  try {
    const result = await pool.query(
      `INSERT INTO instructor_feedback 
       (instructor_id, course_id, student_id, teaching_rating, knowledge_rating, communication_rating, overall_rating, review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [instructor_id, course_id, student_id, teaching_rating, knowledge_rating, communication_rating, overall_rating, review]
    );

    // Notify instructor
    await createNotification(
      instructor_id,
      'New Instructor Feedback',
      `You received new feedback with an overall rating of ${overall_rating.toFixed(1)} stars.`,
      'INSTRUCTOR_FEEDBACK',
      '/instructor-dashboard'
    );

    res.status(201).json({ message: 'Instructor feedback submitted successfully.', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'You have already submitted feedback for this instructor.' });
    }
    console.error('Error submitting instructor feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/instructor/:instructorId', authMiddleware(), async (req, res) => {
  let { instructorId } = req.params;
  if (instructorId === 'me') instructorId = req.user.userId || req.user.id;
  try {
    const result = await pool.query(`
      SELECT inf.*, u.full_name as student_name, c.title as course_title
      FROM instructor_feedback inf
      LEFT JOIN users u ON inf.student_id = u.id
      LEFT JOIN courses c ON inf.course_id = c.id
      WHERE inf.instructor_id = $1
      ORDER BY inf.created_at DESC
    `, [instructorId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching instructor feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get instructor feedback for an organization
router.get('/instructor/org/me', authMiddleware(), async (req, res) => {
  const orgId = req.user.organization_id || req.user.userId || req.user.id;
  try {
    const result = await pool.query(`
      SELECT inf.*, u.full_name as student_name, c.title as course_title
      FROM instructor_feedback inf
      LEFT JOIN users u ON inf.student_id = u.id
      LEFT JOIN courses c ON inf.course_id = c.id
      JOIN users inst ON inf.instructor_id = inst.id
      WHERE inst.organization_id = $1
      ORDER BY inf.created_at DESC
    `, [orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching org instructor feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================
// LESSON FEEDBACK
// ============================================
router.post('/lesson', authMiddleware(), async (req, res) => {
  const { lesson_id, is_helpful, comment } = req.body;
  const student_id = (req.user.userId || req.user.id);

  try {
    const result = await pool.query(
      `INSERT INTO lesson_feedback (lesson_id, student_id, is_helpful, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [lesson_id, student_id, is_helpful, comment]
    );

    res.status(201).json({ message: 'Lesson feedback submitted successfully.', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'You have already submitted feedback for this lesson.' });
    }
    console.error('Error submitting lesson feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if user has already submitted feedback for a lesson
router.get('/lesson/check/:lessonId', authMiddleware(), async (req, res) => {
  const { lessonId } = req.params;
  const student_id = (req.user.userId || req.user.id);
  
  try {
    const result = await pool.query(
      'SELECT id FROM lesson_feedback WHERE lesson_id = $1 AND student_id = $2',
      [lessonId, student_id]
    );
    res.json({ hasSubmitted: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking lesson feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get lesson feedback for an instructor
router.get('/lesson/instructor/:instructorId', authMiddleware(), async (req, res) => {
  let { instructorId } = req.params;
  if (instructorId === 'me') instructorId = req.user.userId || req.user.id;
  try {
    const result = await pool.query(`
      SELECT lf.*, l.title as lesson_title, c.title as course_title, c.id as course_id, u.full_name as student_name
      FROM lesson_feedback lf
      JOIN lessons l ON lf.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN users u ON lf.student_id = u.id
      WHERE c.instructor_id = $1
      ORDER BY lf.created_at DESC
    `, [instructorId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lesson feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get lesson feedback for an organization
router.get('/lesson/org/me', authMiddleware(), async (req, res) => {
  const orgId = req.user.organization_id || req.user.userId || req.user.id;
  try {
    const result = await pool.query(`
      SELECT lf.*, l.title as lesson_title, c.title as course_title, c.id as course_id, u.full_name as student_name
      FROM lesson_feedback lf
      JOIN lessons l ON lf.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      JOIN users inst ON c.instructor_id = inst.id
      LEFT JOIN users u ON lf.student_id = u.id
      WHERE inst.organization_id = $1
      ORDER BY lf.created_at DESC
    `, [orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching org lesson feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PLATFORM FEEDBACK
// ============================================
router.post('/platform', authMiddleware(), async (req, res) => {
  const { category, subject, description, rating } = req.body;
  const user_id = (req.user.userId || req.user.id);
  const user_role = req.user.role;
  const organization_id = req.user.organization_id || null;

  try {
    const result = await pool.query(
      `INSERT INTO platform_feedback (user_id, user_role, organization_id, category, subject, description, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, user_role, organization_id, category, subject, description, rating || 0]
    );

    // Notify Super Admin
    await createNotification(
      null, // Assuming Super Admin gets null user_id notifications for global events
      'New Platform Feedback',
      `A new ${category} was submitted by a ${user_role}. Subject: ${subject}`,
      'PLATFORM_FEEDBACK',
      '/admin-dashboard'
    );

    res.status(201).json({ message: 'Platform feedback submitted successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting platform feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all platform feedback (For Super Admin and Org Admin)
router.get('/platform', authMiddleware(), async (req, res) => {
  try {
    const role = (req.user.role || '').toUpperCase();
    let result;

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      result = await pool.query(`
        SELECT pf.*, u.full_name as user_name, u.email as user_email, o.name as org_name
        FROM platform_feedback pf
        LEFT JOIN users u ON pf.user_id = u.id
        LEFT JOIN organizations o ON pf.organization_id = o.id
        ORDER BY pf.created_at DESC
      `);
    } else if (role === 'ORGANIZATION_ADMIN') {
      result = await pool.query(`
        SELECT pf.*, u.full_name as user_name, u.email as user_email
        FROM platform_feedback pf
        LEFT JOIN users u ON pf.user_id = u.id
        WHERE pf.organization_id = $1
        ORDER BY pf.created_at DESC
      `, [req.user.organization_id]);
    } else {
      // User viewing their own platform feedback
      result = await pool.query(`
        SELECT pf.*
        FROM platform_feedback pf
        WHERE pf.user_id = $1
        ORDER BY pf.created_at DESC
      `, [(req.user.userId || req.user.id)]);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching platform feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update status (Super Admin only)
router.put('/platform/:id/status', authMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Note: Add proper authorization check here if needed

  try {
    const result = await pool.query(
      `UPDATE platform_feedback SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    res.json({ message: 'Status updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating platform feedback status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reply (Super Admin only)
router.put('/platform/:id/reply', authMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { admin_reply } = req.body;

  try {
    const result = await pool.query(
      `UPDATE platform_feedback SET admin_reply = $1, status = 'Reviewed', updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [admin_reply, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    const feedback = result.rows[0];

    // Notify the user who submitted the feedback
    await createNotification(
      feedback.user_id,
      'Reply to your Platform Feedback',
      `An admin has replied to your ${feedback.category} "${feedback.subject}".`,
      'PLATFORM_REPLY',
      '/user-dashboard'
    );

    res.json({ message: 'Reply saved and user notified.', data: feedback });
  } catch (error) {
    console.error('Error adding reply to platform feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// ORG ADMIN ROUTES
router.get('/course/org/:orgId', authMiddleware(), async (req, res) => {
  let { orgId } = req.params;
  if (orgId === 'me') {
    const userRow = await pool.query('SELECT organization_id FROM users WHERE id = $1', [req.user.userId]);
    orgId = userRow.rows[0]?.organization_id;
  }
  
  try {
    const result = await pool.query(
      `SELECT cf.*, c.title as course_title, CASE WHEN cf.is_anonymous THEN 'Anonymous' ELSE u.full_name END as student_name
       FROM course_feedback cf
       JOIN courses c ON cf.course_id = c.id
       LEFT JOIN users u ON cf.student_id = u.id
       WHERE c.organization_id = $1
       ORDER BY cf.created_at DESC`,
      [orgId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching org course feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/instructor/org/:orgId', authMiddleware(), async (req, res) => {
  let { orgId } = req.params;
  if (orgId === 'me') {
    const userRow = await pool.query('SELECT organization_id FROM users WHERE id = $1', [req.user.userId]);
    orgId = userRow.rows[0]?.organization_id;
  }
  
  try {
    const result = await pool.query(
      `SELECT inf.*, u.full_name as student_name, c.title as course_title
       FROM instructor_feedback inf
       JOIN courses c ON inf.course_id = c.id
       LEFT JOIN users u ON inf.student_id = u.id
       WHERE c.organization_id = $1
       ORDER BY inf.created_at DESC`,
      [orgId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching org instructor feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

return router;
};
