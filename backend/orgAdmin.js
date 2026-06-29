const express = require('express');
const pool = require('./db');
const bcrypt = require('bcryptjs');

module.exports = (authMiddleware) => {
  const router = express.Router();

  // Protect all org-admin routes
  router.use(authMiddleware(['ORGANIZATION_ADMIN']));

  // 1. Get pending users for this organization
  router.get('/users/pending', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const result = await pool.query(
        "SELECT id, email, full_name, role, created_at FROM users WHERE role IN ('LEARNER', 'INSTRUCTOR') AND is_approved = false AND organization_id = $1 ORDER BY created_at DESC",
        [orgId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching pending users' });
    }
  });

  // 2. Approve a user in this organization
  router.put('/users/:id/approve', async (req, res) => {
    const { id } = req.params;
    const orgId = req.user.organization_id;
    try {
      // Get user role first
      const userCheck = await pool.query("SELECT role FROM users WHERE id = $1 AND organization_id = $2 AND is_approved = false", [id, orgId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found or already approved' });
      }
      const userRole = userCheck.rows[0].role;

      // Check active subscription and limits
      const subQuery = await pool.query(`
        SELECT p.name, f.feature_value, s.end_date 
        FROM subscriptions s 
        JOIN subscription_plans p ON s.plan_id = p.id 
        LEFT JOIN plan_features f ON p.id = f.plan_id AND f.feature_name ILIKE $1
        WHERE s.organization_id = $2 AND s.status = 'active'
        ORDER BY s.end_date DESC LIMIT 1
      `, [userRole === 'INSTRUCTOR' ? '%Instructor%' : '%Learner%', orgId]);

      if (subQuery.rows.length === 0) {
        return res.status(403).json({ error: 'Cannot approve user: Organization does not have an active subscription.' });
      }

      const featureValue = subQuery.rows[0].feature_value;
      const endDate = subQuery.rows[0].end_date ? new Date(subQuery.rows[0].end_date).toLocaleDateString() : 'the next billing cycle';
      
      if (featureValue && featureValue.toLowerCase() !== 'unlimited') {
        const maxAllowed = parseInt(featureValue, 10);
        const currentCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = $1 AND is_approved = true AND organization_id = $2", [userRole, orgId]);
        const currentCount = parseInt(currentCountRes.rows[0].count, 10);
        
        if (currentCount >= maxAllowed) {
           return res.status(403).json({ error: `Cannot approve user: You have reached the limit of your respective plan and need to wait till ${endDate} for further access.` });
        }
      }

      const result = await pool.query(
        "UPDATE users SET is_approved = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND role IN ('LEARNER', 'INSTRUCTOR') AND organization_id = $2 RETURNING id, email, full_name, role, is_approved",
        [id, orgId]
      );

      const chatEvents = require('./chatEvents');
      await chatEvents.addUserToSystemGroup(id);
      await chatEvents.addUserToOrgGroup(id, orgId);

      res.json({ message: 'User approved successfully', user: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error approving user' });
    }
  });

  // Reject a user in this organization
  router.delete('/users/:id/reject', async (req, res) => {
    const { id } = req.params;
    const orgId = req.user.organization_id;
    try {
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 AND role IN ('LEARNER', 'INSTRUCTOR') AND is_approved = false AND organization_id = $2 RETURNING id",
        [id, orgId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found, already approved, or does not belong to your organization' });
      }

      res.json({ message: 'User rejected and removed successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error rejecting user' });
    }
  });

  // Get instructor courses for this organization
  router.get('/instructors/courses', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const query = `
        SELECT 
          c.id, c.title, c.description, c.thumbnail_url, c.thumbnail_file, c.is_published, c.is_approved, c.created_at,
          json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email) as instructor,
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as total_enrollments
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE u.role = 'INSTRUCTOR' AND (u.organization_id = $1 OR c.organization_id = $1)
        ORDER BY c.created_at DESC
      `;
      const result = await pool.query(query, [orgId]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching instructor courses' });
    }
  });

  // Review a course (approve or reject)
  router.post('/instructors/courses/:id/review', async (req, res) => {
    try {
      const courseId = req.params.id;
      const { action } = req.body;
      const orgId = req.user.organization_id;

      // Verify course belongs to this org
      const verifyCourse = await pool.query(
        "SELECT c.id FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.id = $1 AND (u.organization_id IS NOT DISTINCT FROM $2 OR c.organization_id IS NOT DISTINCT FROM $2)",
        [courseId, orgId]
      );

      if (verifyCourse.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found or unauthorized' });
      }

      if (action === 'approve') {
        await pool.query("UPDATE courses SET is_approved = true WHERE id = $1", [courseId]);
        res.json({ message: 'Course approved successfully' });
      } else if (action === 'reject') {
        await pool.query("DELETE FROM courses WHERE id = $1", [courseId]);
        res.json({ message: 'Course rejected and deleted successfully' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error reviewing course' });
    }
  });

  //Get comprehensive student reports for this organization
  router.get('/reports/students', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      // Get all approved students for this org
      const studentsResult = await pool.query(
        "SELECT id, email, full_name, created_at FROM users WHERE role = 'LEARNER' AND is_approved = true AND organization_id = $1",
        [orgId]
      );
      const students = studentsResult.rows;

      if (students.length === 0) {
        return res.json([]);
      }

      const studentIds = students.map(s => s.id);

      //Get enrollments with course details
      const enrollmentsResult = await pool.query(`
        SELECT e.id as enrollment_id, e.student_id, e.course_id, 
        CASE 
          WHEN (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) > 0 
               AND (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) = (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.enrollment_id = e.id AND lp.is_completed = true)
          THEN CURRENT_TIMESTAMP
          ELSE e.completed_at
        END as completed_at, 
        c.title as course_title
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ANY($1)
      `, [studentIds]);
      const enrollments = enrollmentsResult.rows;

      //Get assessment grades
      const gradesResult = await pool.query(`
        SELECT sub.enrollment_id, sub.grade, a.title as assessment_title
        FROM assessment_submissions sub
        JOIN assessments a ON sub.assessment_id = a.id
        WHERE sub.is_graded = true
      `);
      const grades = gradesResult.rows;

      // Build report structure
      const reports = students.map(student => {
        const studentEnrollments = enrollments.filter(e => e.student_id === student.id);

        const coursesData = studentEnrollments.map(enrollment => {
          const studentGrades = grades.filter(g => g.enrollment_id === enrollment.enrollment_id);
          return {
            course_id: enrollment.course_id,
            course_title: enrollment.course_title,
            completed_at: enrollment.completed_at,
            assessments: studentGrades
          };
        });

        return {
          ...student,
          total_courses: studentEnrollments.length,
          courses: coursesData
        };
      });

      res.json(reports);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching student reports' });
    }
  });

  // Get all instructors for this organization
  router.get('/instructors', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const result = await pool.query(
        "SELECT id, email, full_name, is_active, created_at FROM users WHERE role = 'INSTRUCTOR' AND is_approved = true AND organization_id = $1 ORDER BY created_at DESC",
        [orgId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching instructors' });
    }
  });


  // 7. Get all learners for this organization
  router.get('/learners', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const result = await pool.query(
        "SELECT id, email, full_name, is_active, created_at FROM users WHERE role = 'LEARNER' AND is_approved = true AND organization_id = $1 ORDER BY created_at DESC",
        [orgId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching learners' });
    }
  });


  // 9. Get Announcements
  router.get('/announcements', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      // Org Admins see their own announcements and Super Admin announcements
      const result = await pool.query(
        "SELECT * FROM announcements WHERE ((organization_id = $1 AND author_role = 'ORGANIZATION_ADMIN') OR (organization_id IS NULL AND author_role = 'SUPER_ADMIN')) AND id NOT IN (SELECT announcement_id FROM user_hidden_announcements WHERE user_id = $2) ORDER BY created_at DESC", 
        [orgId, req.user.userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching announcements' });
    }
  });

  // 10. Create Announcement
  router.post('/announcements', async (req, res) => {
    const { title, content } = req.body;
    const orgId = req.user.organization_id;
    try {
      const result = await pool.query(
        "INSERT INTO announcements (organization_id, title, content, author_role, author_id) VALUES ($1, $2, $3, 'ORGANIZATION_ADMIN', $4) RETURNING *",
        [orgId, title, content, req.user.userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error creating announcement' });
    }
  });

  // Update Announcement
  router.put('/announcements/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const orgId = req.user.organization_id;
    try {
      const result = await pool.query(
        "UPDATE announcements SET title = $1, content = $2 WHERE id = $3 AND organization_id = $4 AND author_role = 'ORGANIZATION_ADMIN' RETURNING *",
        [title, content, id, orgId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error updating announcement' });
    }
  });

  // Delete Announcement
  router.delete('/announcements/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const check = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      if (check.rows[0].author_role === 'ORGANIZATION_ADMIN' && check.rows[0].author_id === req.user.userId) {
        await pool.query("DELETE FROM announcements WHERE id = $1", [id]);
      } else {
        try {
          await pool.query("INSERT INTO user_hidden_announcements (user_id, announcement_id) VALUES ($1, $2)", [req.user.userId, id]);
        } catch (e) {
          if (e.code !== '23505') throw e;
        }
      }
      res.json({ message: 'Deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });



  // 13. Get Profile
  router.get('/profile', async (req, res) => {
    try {
      const result = await pool.query("SELECT full_name, email, phone_number, role, profile_pic FROM users WHERE id = $1", [req.user.userId]);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching profile' });
    }
  });

  // 14. Update Profile
  router.put('/profile', async (req, res) => {
    const { full_name, phone_number, profile_pic } = req.body;
    try {
      const result = await pool.query(
        "UPDATE users SET full_name=$1, phone_number=$2, profile_pic=$3 WHERE id=$4 RETURNING full_name, email, phone_number, profile_pic",
        [full_name, phone_number, profile_pic, req.user.userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error updating profile' });
    }
  });

  // 15. Get Subscription
  router.get('/subscription', async (req, res) => {

    res.json({ plan: 'Enterprise Plan', price: '$499', billing: 'annually' });
  });

  // 16. Get Learner Progress
  router.get('/progress', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const query = `
        SELECT
          u.id as learner_id,
          u.full_name as learner_name,
          c.id as course_id,
          c.title as course_title,
          e.created_at as enrolled_at,
          COALESCE(
            (SELECT MAX(lp.updated_at) 
             FROM lesson_progress lp 
             WHERE lp.enrollment_id = e.id),
            e.created_at
          ) as last_active,
          (
            SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id
          ) as total_lessons,
          (
            SELECT COUNT(*) FROM lesson_progress lp 
            JOIN lessons l ON lp.lesson_id = l.id
            JOIN modules m ON l.module_id = m.id
            WHERE lp.enrollment_id = e.id AND lp.is_completed = true AND m.course_id = c.id
          ) as completed_lessons
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE u.organization_id = $1 AND u.role = 'LEARNER'
        ORDER BY last_active DESC;
      `;
      const result = await pool.query(query, [orgId]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching progress data' });
    }
  });

  // 18. Get Exam Analytics
  router.get('/exams/analytics', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      
      const attemptsRes = await pool.query(`
        SELECT a.id, a.status, a.total_score, a.started_at, a.submitted_at, 
               u.full_name as student_name,
               e.title as exam_title,
               c.title as course_title
        FROM course_exam_attempts a
        JOIN users u ON a.student_id = u.id
        JOIN course_exams e ON a.exam_id = e.id
        JOIN courses c ON e.course_id = c.id
        WHERE u.organization_id = $1 AND a.status != 'IN_PROGRESS'
        ORDER BY a.started_at DESC NULLS LAST
      `, [orgId]);

      const attempts = attemptsRes.rows;

      const totalAttempts = attempts.length;
      const uniqueExams = new Set(attempts.map(a => a.exam_title)).size;
      
      const passedCount = attempts.filter(a => a.status === 'PASSED').length;
      const averagePassRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
      
      const totalScoreSum = attempts.reduce((sum, a) => sum + parseFloat(a.total_score || 0), 0);
      const averageScore = totalAttempts > 0 ? (totalScoreSum / totalAttempts).toFixed(1) : 0;

      res.json({
        totalExamsConducted: uniqueExams,
        averagePassRate,
        totalAttempts,
        averageScore,
        recentAttempts: attempts
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching exam analytics' });
    }
  });

  // 17. Get Overview Stats for Institute Dashboard
  router.get('/overview-stats', async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      
      const learnersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'LEARNER' AND is_approved = true AND organization_id = $1", [orgId]);
      const totalLearners = parseInt(learnersRes.rows[0].count);

      const instructorsRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'INSTRUCTOR' AND is_approved = true AND organization_id = $1", [orgId]);
      const totalInstructors = parseInt(instructorsRes.rows[0].count);

      const coursesRes = await pool.query("SELECT COUNT(*) FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.is_published = true AND c.is_approved = true AND (u.organization_id = $1 OR c.organization_id = $1)", [orgId]);
      const activeCourses = parseInt(coursesRes.rows[0].count);

      // 4. Avg Completion
      const completionRes = await pool.query(`
        WITH CourseStats AS (
          SELECT e.id as enrollment_id,
            (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = e.course_id) as total_lessons,
            (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.enrollment_id = e.id AND lp.is_completed = true) as completed_lessons
          FROM enrollments e
          JOIN users u ON e.student_id = u.id
          WHERE u.organization_id = $1
        )
        SELECT COUNT(CASE WHEN total_lessons > 0 AND total_lessons = completed_lessons THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as avg_completion 
        FROM CourseStats
      `, [orgId]);
      const avgCompletion = completionRes.rows[0].avg_completion ? Math.round(completionRes.rows[0].avg_completion) : 0;

      // 5. Platform Growth (Last 5 months cumulative)
      const growthRes = await pool.query(`
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', current_date) - interval '4 months', 
                date_trunc('month', current_date), 
                '1 month'
            ) as month
        )
        SELECT 
            to_char(m.month, 'Mon') as name,
            (SELECT COUNT(*) FROM courses c JOIN users u ON c.instructor_id = u.id WHERE date_trunc('month', c.created_at) <= m.month AND (u.organization_id = $1 OR c.organization_id = $1) AND c.is_published = true AND c.is_approved = true) as courses,
            (SELECT COUNT(*) FROM users u WHERE date_trunc('month', u.created_at) <= m.month AND u.organization_id = $1 AND u.role = 'LEARNER' AND u.is_approved = true) as learners
        FROM months m
        ORDER BY m.month;
      `, [orgId]);
      
      const platformGrowth = growthRes.rows.map(row => ({
        name: row.name,
        courses: parseInt(row.courses),
        learners: parseInt(row.learners)
      }));

      // 6. Recent Activity
      const activityRes = await pool.query(`
        (
            SELECT 
                'enrollment_' || e.id as id,
                u.full_name as user,
                'enrolled in ' || c.title as action,
                e.created_at as time
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            JOIN courses c ON e.course_id = c.id
            WHERE u.organization_id = $1
        )
        UNION ALL
        (
            SELECT 
                'course_' || c.id as id,
                u.full_name as user,
                'published ' || c.title as action,
                c.created_at as time
            FROM courses c
            JOIN users u ON c.instructor_id = u.id
            WHERE (u.organization_id = $1 OR c.organization_id = $1) AND c.is_published = true
        )
        ORDER BY time DESC
        LIMIT 5;
      `, [orgId]);

      const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        if (seconds < 0) return "just now";
        return Math.floor(seconds) + " seconds ago";
      };

      const recentActivity = activityRes.rows.map(row => ({
        id: row.id,
        user: row.user,
        action: row.action,
        time: timeAgo(new Date(row.time))
      }));

      res.json({
        totalLearners,
        totalInstructors,
        activeCourses,
        avgCompletion,
        platformGrowth,
        recentActivity
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching overview stats' });
    }
  });

  // Overview Stats
  router.get('/overview-stats', async (req, res) => {
    try {
      const orgId = req.user.organization_id;

      // 1. Total Learners
      const learnersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'LEARNER' AND organization_id = $1", [orgId]);
      const totalLearners = parseInt(learnersRes.rows[0].count, 10);

      // 2. Total Instructors
      const instructorsRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'INSTRUCTOR' AND organization_id = $1", [orgId]);
      const totalInstructors = parseInt(instructorsRes.rows[0].count, 10);

      // 3. Active Courses
      const coursesRes = await pool.query("SELECT COUNT(*) FROM courses WHERE is_published = true AND instructor_id IN (SELECT id FROM users WHERE organization_id = $1)", [orgId]);
      const activeCourses = parseInt(coursesRes.rows[0].count, 10);

      // 4. Avg Completion
      const avgCompletion = Math.round(Math.random() * 20 + 70); // Placeholder, compute from lesson_progress if needed

      // 5. Platform Growth (Mock data for UI)
      const platformGrowth = [
        { name: 'Jan', learners: Math.floor(totalLearners * 0.2), courses: Math.floor(activeCourses * 0.2) },
        { name: 'Feb', learners: Math.floor(totalLearners * 0.4), courses: Math.floor(activeCourses * 0.4) },
        { name: 'Mar', learners: Math.floor(totalLearners * 0.6), courses: Math.floor(activeCourses * 0.5) },
        { name: 'Apr', learners: Math.floor(totalLearners * 0.8), courses: Math.floor(activeCourses * 0.8) },
        { name: 'May', learners: Math.floor(totalLearners * 0.9), courses: Math.floor(activeCourses * 0.9) },
        { name: 'Jun', learners: totalLearners, courses: activeCourses },
      ];

      // 6. Recent Activity
      const recentActivity = [
        { id: 1, user: 'Admin System', action: 'generated latest report', time: 'Just now' },
        { id: 2, user: 'System', action: 'updated analytics dashboard', time: '2 mins ago' }
      ];

      res.json({
        totalLearners,
        totalInstructors,
        activeCourses,
        avgCompletion,
        platformGrowth,
        recentActivity
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching overview stats' });
    }
  });

  return router;
};
