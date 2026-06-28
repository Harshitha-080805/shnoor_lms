const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('./db');
const http = require('http');
const socketManager = require('./socketManager');
const chatRoutes = require('./chatRoutes');
const orgAdmin = require('./orgAdmin');
const searchRoutes = require('./searchRoutes');
const path = require('path');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const rateLimit = require('express-rate-limit');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// MIDDLEWARE

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      req.user = decoded;

      // Check roles if provided
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};


// Auth Controller
const registerUser = async (req, res) => {
  try {
    const { 
      email, password, full_name, fullName, role, 
      organization_code, learner_type, roll_number, employee_id, 
      organization_type, organization_name, location, website 
    } = req.body;
    
    const name = fullName || full_name;
    const userRole = (role || 'LEARNER').toUpperCase();

    // Check if user exists
    const existingUserQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUserQuery.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let orgId = null;

    if (userRole === 'ORGANIZATION_ADMIN') {
      if (!organization_code || !organization_name) {
        return res.status(400).json({ error: 'Organization name and code are required for Organization Admins' });
      }
      // Check if org code already exists
      const orgCheck = await pool.query('SELECT * FROM organizations WHERE code = $1', [organization_code]);
      if (orgCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Organization code already exists. Please choose a unique code.' });
      }
      
      // Create organization
      const newOrg = await pool.query(
        'INSERT INTO organizations (name, code, type, location, website) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [organization_name, organization_code, organization_type || 'institute', location || null, website || null]
      );
      orgId = newOrg.rows[0].id;

    } else if (organization_code) {
      // Find existing organization
      const orgQuery = await pool.query('SELECT id FROM organizations WHERE code = $1', [organization_code]);
      if (orgQuery.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid organization code' });
      }
      orgId = orgQuery.rows[0].id;
    }

    // Insert new user
    const insertQuery = `
      INSERT INTO users (email, password, full_name, role, organization_id, learner_type, roll_number, employee_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, full_name, role
    `;
    const newUserQuery = await pool.query(insertQuery, [
      email, 
      hashedPassword, 
      name, 
      userRole, 
      orgId, 
      learner_type || null, 
      roll_number || null, 
      employee_id || null
    ]);
    const user = newUserQuery.rows[0];

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const userQuery = await pool.query(`
      SELECT u.*, 
             (SELECT status FROM subscriptions s WHERE s.organization_id = u.organization_id ORDER BY end_date DESC LIMIT 1) as org_sub_status,
             (SELECT status FROM subscriptions s WHERE s.user_id = u.id ORDER BY end_date DESC LIMIT 1) as user_sub_status
      FROM users u WHERE email = $1
    `, [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const user = userQuery.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 1. Manual revoke by super admin blocks everyone
    if (user.org_sub_status === 'revoked' || user.user_sub_status === 'revoked') {
      return res.status(403).json({ error: 'User access is suspended. Please contact your administrator.' });
    }

    // 2. Expired subscription blocks members, but allows Org Admin / Independent Learner
    if (user.org_sub_status === 'expired' || user.user_sub_status === 'expired') {
      const isOrgAdmin = user.role === 'ORGANIZATION_ADMIN';
      const isIndependentLearner = user.role === 'LEARNER' && !user.organization_id;
      
      if (!isOrgAdmin && !isIndependentLearner) {
        return res.status(403).json({ error: 'Subscription payment is not done. Access is revoked. Please contact your organization administrator.' });
      }
    }

    // 3. Any other deactivation reasons
    if (!user.is_active) {
      if (user.role === 'LEARNER' && user.organization_id) {
        return res.status(403).json({ error: 'Account is suspended. Please contact your organization administrator.' });
      }
      return res.status(403).json({ error: 'Account is suspended. Please contact support.' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Account is pending admin approval. You will be able to login once approved.' });
    }

    // Generate token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1d' });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        learnerType: user.learner_type,
        profilePic: user.profile_pic,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot Password Logic
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User with this email does not exist.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [hashedToken, expiresAt, email]
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Shnoor LMS" <noreply@shnoorlms.com>',
      to: email,
      subject: 'Password Reset Request - Shnoor LMS',
      text: `You requested a password reset. Please go to this link to reset your password: \n\n ${resetUrl} \n\n This link expires in 1 hour. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #1e3a8a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">SHNOOR LMS</h1>
            <p style="color: #93c5fd; margin: 8px 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Account Security</p>
          </div>
          
          <div style="padding: 40px 32px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin: 0 0 20px; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset the password associated with your Shnoor LMS account. If you made this request, please click the button below to securely set a new password.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); transition: background-color 0.2s;">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              For your security, this link will automatically expire in <strong>1 hour</strong>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
              If you did not request a password reset, no further action is required. Your password will remain unchanged. Please do not reply to this automated email.
            </p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Shnoor International LLC. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset link sent to your email.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error sending email.' });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const userQuery = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [hashedToken]
    );

    if (userQuery.rows.length === 0) {
      return res.json({ valid: false });
    }
    return res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const userQuery = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [hashedToken]
    );

    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [hashedPassword, userQuery.rows[0].id]
    );

    res.json({ message: 'Password successfully reset.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin Controller 
const getPendingCourses = async (req, res) => {
  if (req.user.role !== 'ORGANIZATION_ADMIN' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });

  try {
    const query = `
      SELECT 
        c.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) AS instructor
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.is_approved = false AND c.is_published = true
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const reviewCourse = async (req, res) => {
  if (req.user.role !== 'ORGANIZATION_ADMIN' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });

  const { courseId } = req.params;
  const { action } = req.body;

  try {
    if (action === 'approve') {
      await pool.query('UPDATE courses SET is_approved = true WHERE id = $1', [courseId]);
      res.json({ message: 'Course approved successfully' });
    } else if (action === 'reject') {
      await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
      res.json({ message: 'Course rejected and deleted' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getPendingCertificates = async (req, res) => {
  if (req.user.role !== 'ORGANIZATION_ADMIN' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });

  try {
    const query = `
      SELECT cr.*, 
             u.full_name as student_name, 
             u.email as student_email, 
             c.title as course_title
      FROM certificate_requests cr
      JOIN enrollments e ON cr.enrollment_id = e.id
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE cr.status = 'PENDING'
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const reviewCertificate = async (req, res) => {
  if (req.user.role !== 'ORGANIZATION_ADMIN' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });

  const { requestId } = req.params;
  const { action } = req.body;

  try {
    if (action === 'approve') {
      await pool.query("UPDATE certificate_requests SET status = 'APPROVED' WHERE id = $1", [requestId]);
      res.json({ message: 'Certificate approved' });
    } else if (action === 'reject') {
      await pool.query("UPDATE certificate_requests SET status = 'REJECTED' WHERE id = $1", [requestId]);
      res.json({ message: 'Certificate rejected' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Assessment Controller
const createAssessment = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') return res.status(403).json({ error: 'Access denied' });

  const { courseId } = req.params;
  const { title, description } = req.body;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, req.user.userId]);
    if (courseCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    const insertResult = await pool.query(
      'INSERT INTO assessments (course_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [courseId, title, description]
    );
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const submitAssessment = async (req, res) => {
  const { assessmentId } = req.params;
  const answersText = req.body.answersText || ''; // Use empty string to avoid NOT NULL constraint errors
  const submissionFile = req.file ? req.file.path.replace(/\\/g, '/') : null;
  const studentId = req.user.userId;

  try {
    const assessmentRes = await pool.query('SELECT course_id FROM assessments WHERE id = $1', [assessmentId]);
    if (assessmentRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const enrollCheck = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, assessmentRes.rows[0].course_id]);
    if (enrollCheck.rows.length === 0) return res.status(403).json({ error: 'Not enrolled' });

    // Prevent multiple submissions
    const existingSubmission = await pool.query(
      'SELECT id FROM assessment_submissions WHERE enrollment_id = $1 AND assessment_id = $2',
      [enrollCheck.rows[0].id, assessmentId]
    );
    if (existingSubmission.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted this assignment.' });
    }

    const insertResult = await pool.query(
      'INSERT INTO assessment_submissions (enrollment_id, assessment_id, answers_text, submission_file) VALUES ($1, $2, $3, $4) RETURNING *',
      [enrollCheck.rows[0].id, assessmentId, answersText, submissionFile]
    );
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error("Assessment submit error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getInstructorSubmissions = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') return res.status(403).json({ error: 'Access denied' });

  try {
    const query = `
      SELECT sub.*, a.title as assessment_title, u.email as student_email, c.title as course_title, u.full_name as student_name
      FROM assessment_submissions sub
      JOIN assessments a ON sub.assessment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON sub.enrollment_id = e.id
      JOIN users u ON e.student_id = u.id
      WHERE c.instructor_id = $1
    `;
    const result = await pool.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const gradeSubmission = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') return res.status(403).json({ error: 'Access denied' });

  const { submissionId } = req.params;
  const { grade } = req.body;

  try {
    const result = await pool.query(
      'UPDATE assessment_submissions SET grade = $1, is_graded = true WHERE id = $2 RETURNING *',
      [grade, submissionId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Certificate Controller ---
const getCertificateRequests = async (req, res) => {
  try {
    const query = `
      SELECT cr.*, c.title as course_title, c.id as course_id 
      FROM certificate_requests cr
      JOIN enrollments e ON cr.enrollment_id = e.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = $1
    `;
    const result = await pool.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const requestCertificate = async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.userId;

  try {
    const { canRequestCertificate } = require('./helpers/examValidation');
    const validation = await canRequestCertificate(courseId, studentId);
    
    if (!validation.canRequest) {
      return res.status(403).json({ error: validation.reason });
    }

    const enrollRes = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    const enrollmentId = enrollRes.rows[0].id;

    const reqCheck = await pool.query('SELECT * FROM certificate_requests WHERE enrollment_id = $1', [enrollmentId]);
    if (reqCheck.rows.length > 0) return res.json(reqCheck.rows[0]);

    const insertResult = await pool.query(
      'INSERT INTO certificate_requests (enrollment_id) VALUES ($1) RETURNING *',
      [enrollmentId]
    );
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Course Controller
const getApprovedCourses = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) AS instructor,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollments_count,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', p.id, 
            'title', p.title,
            'minimum_completion_percentage', cp.minimum_completion_percentage,
            'minimum_quiz_score', cp.minimum_quiz_score,
            'certificate_required', cp.certificate_required
          )) 
           FROM course_prerequisites cp 
           JOIN courses p ON cp.prerequisite_course_id = p.id 
           WHERE cp.course_id = c.id), '[]'::json
        ) AS prerequisites
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.is_approved = $1
    `;
    const result = await pool.query(query, [true]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching courses' });
  }
};

const createCourse = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Only instructors can create courses' });
  }

  const { title, description, thumbnailUrl, thumbnailFile } = req.body;
  const instructorId = req.user.userId;

  try {
    const query = `
      INSERT INTO courses (title, description, thumbnail_url, thumbnail_file, instructor_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [title, description, thumbnailUrl, thumbnailFile, instructorId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating course' });
  }
};

const getInstructorCourses = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollments_count,
        (
          SELECT COUNT(*) 
          FROM certificate_requests cr 
          JOIN enrollments e ON cr.enrollment_id = e.id 
          WHERE e.course_id = c.id AND cr.status = 'APPROVED'
        ) AS completions_count
      FROM courses c
      WHERE c.instructor_id = $1
    `;
    const result = await pool.query(query, [req.user.userId]);
    const courses = result.rows;

    if (courses.length > 0) {
      const courseIds = courses.map(c => c.id);

      const modulesResult = await pool.query('SELECT * FROM modules WHERE course_id = ANY($1) ORDER BY "order" ASC, id ASC', [courseIds]);
      const modules = modulesResult.rows;

      if (modules.length > 0) {
        const moduleIds = modules.map(m => m.id);

        const quizzesResult = await pool.query('SELECT * FROM quizzes WHERE module_id = ANY($1) ORDER BY id ASC', [moduleIds]);
        const quizzes = quizzesResult.rows;

        if (quizzes.length > 0) {
          const quizIds = quizzes.map(q => q.id);
          const questionsResult = await pool.query('SELECT * FROM questions WHERE quiz_id = ANY($1) ORDER BY id ASC', [quizIds]);

          quizzes.forEach(quiz => {
            quiz.questions = questionsResult.rows.filter(q => q.quiz_id === quiz.id);
          });
        }

        modules.forEach(module => {
          module.quizzes = quizzes.filter(q => q.module_id === module.id);
        });
      }

      courses.forEach(course => {
        course.modules = modules.filter(m => m.course_id === course.id);
      });
    }

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getInstructorStudents = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const enrollmentsRes = await pool.query(`
      SELECT e.*, 
             c.title as course_title,
             u.full_name as student_name, u.email as student_email
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.student_id = u.id
      WHERE c.instructor_id = $1
    `, [req.user.userId]);

    const enrollments = enrollmentsRes.rows;

    if (enrollments.length > 0) {
      const enrollmentIds = enrollments.map(e => e.id);
      const courseIds = [...new Set(enrollments.map(e => e.course_id))];

      const progressRes = await pool.query('SELECT enrollment_id, lesson_id, is_completed FROM lesson_progress WHERE enrollment_id = ANY($1)', [enrollmentIds]);
      const quizAttRes = await pool.query('SELECT enrollment_id, quiz_id, passed, score, total_questions FROM quiz_attempts WHERE enrollment_id = ANY($1)', [enrollmentIds]);
      const modulesRes = await pool.query('SELECT id, course_id FROM modules WHERE course_id = ANY($1)', [courseIds]);

      const moduleIds = modulesRes.rows.map(m => m.id);
      let lessons = [];
      if (moduleIds.length > 0) {
        const lessonsRes = await pool.query('SELECT id, module_id FROM lessons WHERE module_id = ANY($1)', [moduleIds]);
        lessons = lessonsRes.rows;
      }

      for (let e of enrollments) {
        e.student = { id: e.student_id, full_name: e.student_name, email: e.student_email };
        e.course = { id: e.course_id, title: e.course_title };

        e.lesson_progress = progressRes.rows.filter(p => p.enrollment_id === e.id);
        e.quiz_attempts = quizAttRes.rows.filter(q => q.enrollment_id === e.id);

        const eModules = modulesRes.rows.filter(m => m.course_id === e.course_id).map(m => {
          return { ...m, lessons: lessons.filter(l => l.module_id === m.id) };
        });
        e.course.modules = eModules;
      }
    }

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching students' });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const courseResult = await pool.query(`
      SELECT c.*, 
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email) AS instructor
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Fetch prerequisites
    const prereqResult = await pool.query(`
      SELECT cp.prerequisite_course_id as id, c.title, cp.minimum_completion_percentage, cp.minimum_quiz_score, cp.certificate_required
      FROM course_prerequisites cp
      JOIN courses c ON cp.prerequisite_course_id = c.id
      WHERE cp.course_id = $1
    `, [id]);
    course.prerequisites = prereqResult.rows || [];

    // Fetch modules
    const modulesResult = await pool.query('SELECT * FROM modules WHERE course_id = $1 ORDER BY "order" ASC, id ASC', [id]);
    const modules = modulesResult.rows;

    if (modules.length > 0) {
      const moduleIds = modules.map(m => m.id);

      const lessonsResult = await pool.query(`SELECT * FROM lessons WHERE module_id = ANY($1) ORDER BY "order" ASC, id ASC`, [moduleIds]);
      const quizzesResult = await pool.query(`SELECT * FROM quizzes WHERE module_id = ANY($1) ORDER BY id ASC`, [moduleIds]);

      const quizzes = quizzesResult.rows;
      if (quizzes.length > 0) {
        const quizIds = quizzes.map(q => q.id);
        const questionsResult = await pool.query(`SELECT * FROM questions WHERE quiz_id = ANY($1) ORDER BY id ASC`, [quizIds]);

        quizzes.forEach(quiz => {
          quiz.questions = questionsResult.rows.filter(q => q.quiz_id === quiz.id);
        });
      }

      modules.forEach(module => {
        module.lessons = lessonsResult.rows.filter(l => l.module_id === module.id);
        module.quizzes = quizzes.filter(q => q.module_id === module.id);
      });
    }

    course.modules = modules;

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const checkCircularDependency = async (pool, currentCourseId, targetPrereqId) => {
  if (String(currentCourseId) === String(targetPrereqId)) return true;
  const res = await pool.query('SELECT prerequisite_course_id FROM course_prerequisites WHERE course_id = $1', [targetPrereqId]);
  for (let row of res.rows) {
    if (await checkCircularDependency(pool, currentCourseId, row.prerequisite_course_id)) return true;
  }
  return false;
};

const saveCoursePrerequisites = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR' && req.user.role !== 'ORGANIZATION_ADMIN') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { courseId } = req.params;
  // prerequisites should be an array of objects: { id, min_comp, min_quiz, cert_req }
  // but for backward compatibility we also handle prerequisiteIds array of strings
  const { prerequisiteIds, prerequisites } = req.body; 

  try {
    if (req.user.role === 'INSTRUCTOR') {
      const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, req.user.userId]);
      if (courseCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    }

    let prereqsToSave = [];
    if (prerequisites && Array.isArray(prerequisites)) {
       prereqsToSave = prerequisites;
    } else if (prerequisiteIds && Array.isArray(prerequisiteIds)) {
       prereqsToSave = prerequisiteIds.map(id => ({ id, minimum_completion_percentage: 0, minimum_quiz_score: 0, certificate_required: false }));
    }

    // Circular dependency check
    for (const p of prereqsToSave) {
       if (await checkCircularDependency(pool, courseId, p.id)) {
          return res.status(400).json({ error: 'Circular prerequisite dependency detected' });
       }
    }

    await pool.query('DELETE FROM course_prerequisites WHERE course_id = $1', [courseId]);

    for (const p of prereqsToSave) {
      if (String(p.id) !== String(courseId)) { 
        await pool.query(
          'INSERT INTO course_prerequisites (course_id, prerequisite_course_id, minimum_completion_percentage, minimum_quiz_score, certificate_required) VALUES ($1, $2, $3, $4, $5)',
          [courseId, p.id, p.minimum_completion_percentage || 0, p.minimum_quiz_score || 0, p.certificate_required || false]
        );
      }
    }
    
    res.json({ message: 'Prerequisites updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating prerequisites' });
  }
};

// Enrollment Controller
const enrollCourse = async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.userId;

  try {
    const courseResult = await pool.query('SELECT * FROM courses WHERE id = $1 AND is_approved = true', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot enroll in an unapproved or non-existent course' });
    }

    const prereqResult = await pool.query('SELECT prerequisite_course_id, minimum_completion_percentage, minimum_quiz_score, certificate_required FROM course_prerequisites WHERE course_id = $1', [courseId]);
    if (prereqResult.rows.length > 0) {
      const missingPrereqs = [];
      const { canRequestCertificate } = require('./helpers/examValidation');
      
      for (const row of prereqResult.rows) {
        const pId = row.prerequisite_course_id;
        const pCheck = await pool.query('SELECT id, completed_at FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, pId]);
        let isCompleted = false;
        let reasons = [];
        
        if (pCheck.rows.length > 0) {
           const pEnrollId = pCheck.rows[0].id;
           
           // Calculate progress dynamically
           const totalRes = await pool.query('SELECT count(l.id) as total FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1', [pId]);
           const totalLessons = parseInt(totalRes.rows[0].total) || 0;
           const completedRes = await pool.query('SELECT count(lp.id) as completed FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE lp.enrollment_id = $1 AND lp.is_completed = true AND m.course_id = $2', [pEnrollId, pId]);
           const completedLessons = parseInt(completedRes.rows[0].completed) || 0;
           const progress = totalLessons > 0 ? Math.floor((completedLessons / totalLessons) * 100) : 0;
           
           let meetsProgress = progress >= row.minimum_completion_percentage;
           if (!meetsProgress) reasons.push(`Requires ${row.minimum_completion_percentage}% completion (Current: ${progress}%)`);
           
           let meetsQuiz = true;
           if (row.minimum_quiz_score > 0) {
              const quizCheck = await pool.query('SELECT MAX(score) as max_score FROM quiz_attempts WHERE enrollment_id = $1', [pEnrollId]);
              const maxScore = quizCheck.rows[0]?.max_score || 0;
              if (maxScore < row.minimum_quiz_score) {
                 meetsQuiz = false;
                 reasons.push(`Requires quiz score of ${row.minimum_quiz_score}% (Current: ${maxScore}%)`);
              }
           }
           
           let meetsCert = true;
           if (row.certificate_required) {
              const certCheck = await pool.query('SELECT status FROM certificate_requests WHERE enrollment_id = $1 AND status = $2', [pEnrollId, 'APPROVED']);
              if (certCheck.rows.length === 0) {
                 meetsCert = false;
                 reasons.push('Requires an approved certificate');
              }
           }
           
           // If they have completed_at, they are done by default UNLESS strict rules fail
           const validation = await canRequestCertificate(pId, studentId);
           if ((validation.canRequest || pCheck.rows[0].completed_at) && meetsProgress && meetsQuiz && meetsCert) {
             isCompleted = true;
           } else if (meetsProgress && meetsQuiz && meetsCert) {
             // Or if no completion timestamp but they strictly meet all set advanced rules
             // If all rules were 0/false, they still need to "complete" it normally
             if (row.minimum_completion_percentage > 0 || row.minimum_quiz_score > 0 || row.certificate_required) {
                isCompleted = true;
             }
           }
        } else {
           reasons.push('Not enrolled or started');
        }
        
        if (!isCompleted) {
          const cNameRes = await pool.query('SELECT title FROM courses WHERE id = $1', [pId]);
          missingPrereqs.push({ id: pId, title: cNameRes.rows[0]?.title || 'Unknown Course', reasons });
        }
      }

      if (missingPrereqs.length > 0) {
        return res.status(403).json({ 
          error: 'Prerequisites not met', 
          missingPrerequisites: missingPrereqs 
        });
      }
    }

    const enrollCheck = await pool.query('SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    if (enrollCheck.rows.length > 0) {
      return res.status(200).json(enrollCheck.rows[0]);
    }

    const insertResult = await pool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *',
      [studentId, courseId]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error enrolling in course' });
  }
};

// Lesson Controller 
const createLesson = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Only instructors can create lessons' });
  }

  const { moduleId } = req.params;
  const { title, contentType, textContent, videoUrl, videoFile, audioUrl, audioFile, imageUrl, imageFile, order } = req.body;

  try {
    const checkQuery = `
      SELECT c.instructor_id, c.id as course_id
      FROM modules m
      JOIN courses c ON m.course_id = c.id
      WHERE m.id = $1
    `;
    const checkResult = await pool.query(checkQuery, [moduleId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (checkResult.rows[0].instructor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied to this module' });
    }

    const insertQuery = `
      INSERT INTO lessons (module_id, title, content_type, text_content, video_url, video_file, audio_url, audio_file, image_url, image_file, "order")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [
      moduleId, title, contentType || 'TEXT', textContent, videoUrl, videoFile, audioUrl, audioFile, imageUrl, imageFile, order || 0
    ]);

    await pool.query('UPDATE courses SET is_approved = false, is_published = false WHERE id = $1', [checkResult.rows[0].course_id]);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating lesson' });
  }
};

// Module Controller
const createModule = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Only instructors can create modules' });
  }

  const { courseId } = req.params;
  const { title, order } = req.body;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, req.user.userId]);
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    const query = `
      INSERT INTO modules (course_id, title, "order")
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [courseId, title, order || 0]);

    await pool.query('UPDATE courses SET is_approved = false, is_published = false WHERE id = $1', [courseId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating module' });
  }
};

const reorderModules = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { courseId } = req.params;
  const { modules } = req.body;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, req.user.userId]);
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    for (const m of modules) {
      if (m.id !== undefined && m.order !== undefined) {
        await pool.query('UPDATE modules SET "order" = $1 WHERE id = $2 AND course_id = $3', [m.order, m.id, courseId]);
      }
    }

    res.json({ message: 'Modules reordered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error reordering modules' });
  }
};

// Quiz Controller
const createQuiz = async (req, res) => {
  if (req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({ error: 'Only instructors can create quizzes' });
  }

  const { moduleId } = req.params;
  const { title, passingScore } = req.body;

  try {
    const checkQuery = `
      SELECT c.instructor_id, c.id as course_id
      FROM modules m
      JOIN courses c ON m.course_id = c.id
      WHERE m.id = $1
    `;
    const checkResult = await pool.query(checkQuery, [moduleId]);

    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    if (checkResult.rows[0].instructor_id !== req.user.userId) return res.status(403).json({ error: 'Access denied' });

    const insertQuery = `
      INSERT INTO quizzes (module_id, title, passing_score)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [moduleId, title, passingScore || 60]);

    await pool.query('UPDATE courses SET is_approved = false, is_published = false WHERE id = $1', [checkResult.rows[0].course_id]);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating quiz' });
  }
};

const submitQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { answers } = req.body;
  const studentId = req.user.userId;

  try {
    const quizResult = await pool.query('SELECT q.*, m.course_id FROM quizzes q JOIN modules m ON q.module_id = m.id WHERE q.id = $1', [quizId]);
    if (quizResult.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = quizResult.rows[0];

    const enrollCheck = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, quiz.course_id]);
    if (enrollCheck.rows.length === 0) return res.status(403).json({ error: 'You are not enrolled in this course' });
    const enrollmentId = enrollCheck.rows[0].id;

    const questionsResult = await pool.query('SELECT * FROM questions WHERE quiz_id = $1', [quizId]);
    const questions = questionsResult.rows;

    let correctCount = 0;
    const totalQuestions = questions.length;

    for (const q of questions) {
      const userAns = answers[q.id];
      if (userAns) {
        if (Array.isArray(userAns)) {
          const sortedUserAns = userAns.map(a => a.trim().toUpperCase()).sort().join(',');
          const correctAns = q.correct_answers.split(',').map(a => a.trim().toUpperCase()).sort().join(',');
          if (sortedUserAns === correctAns) correctCount++;
        } else {
          if (userAns.trim().toUpperCase() === q.correct_answers.trim().toUpperCase()) correctCount++;
        }
      }
    }

    let passed = false;
    if (totalQuestions > 0) {
      const passingPct = quiz.passing_score / 100.0;
      passed = (correctCount / totalQuestions) >= passingPct;
    }

    const attemptQuery = `
      INSERT INTO quiz_attempts (enrollment_id, quiz_id, score, total_questions, passed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const attemptResult = await pool.query(attemptQuery, [enrollmentId, quizId, correctCount, totalQuestions, passed]);

    const { checkAndMarkCourseCompletion } = require('./helpers/examValidation');
    await checkAndMarkCourseCompletion(quiz.course_id, studentId);

    res.json(attemptResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error grading quiz' });
  }
};


// ROUTES


// Auth Routes (/api/accounts)
app.post('/api/accounts/register', registerUser);
app.post('/api/accounts/login', loginUser);
app.post('/api/forgot-password', forgotPassword);
app.get('/api/verify-reset-token/:token', verifyResetToken);
app.post('/api/reset-password-with-token', resetPasswordWithToken);
app.get('/api/accounts/profile', authMiddleware(), async (req, res) => {
  try {
    const result = await pool.query('SELECT full_name, email, phone_number, role, is_active, profile_pic FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

app.put('/api/accounts/profile', authMiddleware(), async (req, res) => {
  try {
    const { full_name, phone_number, profile_pic } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name = $1, phone_number = $2, profile_pic = $3 WHERE id = $4 RETURNING full_name, email, phone_number, role, profile_pic',
      [full_name, phone_number, profile_pic, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

app.put('/api/accounts/password', authMiddleware(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userQuery = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.userId]);
    const user = userQuery.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating password' });
  }
});

app.post('/api/accounts/streak', authMiddleware(), async (req, res) => {
  try {
    const updateQuery = `
      UPDATE users 
      SET 
        streak_count = CASE 
          WHEN last_login_date = CURRENT_DATE THEN streak_count
          WHEN last_login_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_count + 1
          ELSE 1 
        END,
        last_login_date = CURRENT_DATE
      WHERE id = $1
      RETURNING streak_count
    `;
    const result = await pool.query(updateQuery, [req.user.userId]);
    res.json({ streak_count: result.rows[0].streak_count || 1 });
  } catch (err) {
    console.error('Streak update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Super Admin User Controllers
const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT u.*, 
             o.name AS org_name, 
             o.code AS org_code, 
             o.type AS org_type, 
             o.location AS org_location, 
             o.website AS org_website
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

const approveUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [userId]);
    res.json({ message: 'User approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error approving user' });
  }
};

const deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
};

// Auth Admin Routes (/api/auth/admin)
app.get('/api/auth/admin/users', authMiddleware(), getAllUsers);
app.post('/api/auth/admin/users/:userId/approve', authMiddleware(), approveUser);
app.delete('/api/auth/admin/users/:userId/delete', authMiddleware(), deleteUser);

// Admin Routes (/api/admin)
app.get('/api/admin/pending-courses', authMiddleware(['ORGANIZATION_ADMIN', 'ADMIN']), getPendingCourses);
app.post('/api/admin/courses/:courseId/review', authMiddleware(['ORGANIZATION_ADMIN', 'ADMIN']), reviewCourse);
app.get('/api/admin/pending-certificates', authMiddleware(['ORGANIZATION_ADMIN', 'ADMIN']), getPendingCertificates);
app.post('/api/admin/certificates/:requestId/review', authMiddleware(['ORGANIZATION_ADMIN', 'ADMIN']), reviewCertificate);

// Course Routes (/api/courses)
const multer = require('multer');
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

// Public/Learner routes
app.get('/api/courses/', authMiddleware(), getApprovedCourses);

// Enrollments (must be before any :id/:courseId routes)
app.get('/api/courses/enrollments', authMiddleware(), async (req, res) => {
  try {
    const studentId = req.user.userId;
    const enrollmentsRes = await pool.query(`
      SELECT e.*, 
             c.title as course_title, c.thumbnail_url, c.thumbnail_file, 
             u.full_name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE e.student_id = $1
    `, [studentId]);

    const enrollments = enrollmentsRes.rows;
    for (let e of enrollments) {
      e.course = {
        id: e.course_id, title: e.course_title,
        thumbnail_url: e.thumbnail_url, thumbnail_file: e.thumbnail_file,
        instructor: { full_name: e.instructor_name }
      };

      // fetch modules
      const modulesRes = await pool.query('SELECT * FROM modules WHERE course_id = $1 ORDER BY "order" ASC', [e.course_id]);
      e.course.modules = modulesRes.rows;

      if (e.course.modules.length > 0) {
        const moduleIds = e.course.modules.map(m => m.id);
        const lessonsRes = await pool.query(`SELECT * FROM lessons WHERE module_id = ANY($1) ORDER BY "order" ASC`, [moduleIds]);
        const quizzesRes = await pool.query(`SELECT * FROM quizzes WHERE module_id = ANY($1)`, [moduleIds]);

        // Fetch questions for each quiz
        for (let quiz of quizzesRes.rows) {
          const questionsRes = await pool.query('SELECT * FROM questions WHERE quiz_id = $1', [quiz.id]);
          quiz.questions = questionsRes.rows;
        }

        e.course.modules.forEach(m => {
          m.lessons = lessonsRes.rows.filter(l => l.module_id === m.id);
          m.quizzes = quizzesRes.rows.filter(q => q.module_id === m.id);
        });
      }

      // fetch progress
      const progressRes = await pool.query('SELECT lesson_id as lesson, is_completed FROM lesson_progress WHERE enrollment_id = $1', [e.id]);
      e.lesson_progress = progressRes.rows;

      // fetch quiz attempts
      const quizAttRes = await pool.query('SELECT quiz_id as quiz, passed, score, total_questions FROM quiz_attempts WHERE enrollment_id = $1', [e.id]);
      e.quiz_attempts = quizAttRes.rows;

      // fetch assessments
      const assessRes = await pool.query('SELECT * FROM assessments WHERE course_id = $1 ORDER BY id ASC', [e.course_id]);
      e.course.assessments = assessRes.rows;

      // fetch assessment submissions
      const subRes = await pool.query('SELECT * FROM assessment_submissions WHERE enrollment_id = $1', [e.id]);
      e.assessment_submissions = subRes.rows;

      // fetch course exam attempts
      const examRes = await pool.query('SELECT id FROM course_exams WHERE course_id = $1 AND status = $2 AND is_deleted = false', [e.course_id, 'PUBLISHED']);
      e.course.has_course_exam = examRes.rows.length > 0;
      
      const examAttRes = await pool.query(`
        SELECT a.* 
        FROM course_exam_attempts a
        JOIN course_exams ce ON a.exam_id = ce.id
        WHERE a.student_id = $1 AND ce.course_id = $2
      `, [studentId, e.course_id]);
      e.course_exam_attempts = examAttRes.rows;
    }
    res.json(enrollments);
  } catch (err) {
    console.error('ENROLLMENTS ERROR:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// Certificates (must be before :courseId routes)
app.get('/api/courses/certificates', authMiddleware(), getCertificateRequests);
app.get('/api/courses/instructor/my-courses', authMiddleware(['INSTRUCTOR']), getInstructorCourses);
app.get('/api/courses/instructor/students', authMiddleware(['INSTRUCTOR']), getInstructorStudents);
app.get('/api/courses/instructor/submissions', authMiddleware(['INSTRUCTOR']), getInstructorSubmissions);

// Instructor routes
app.post('/api/courses/', authMiddleware(['INSTRUCTOR']), upload.single('thumbnail_file'), async (req, res) => {
  const { title, description, thumbnail_url, estimated_duration, learning_outcomes, skills_gained, difficulty_level, prerequisites_enabled } = req.body;
  const instructorId = req.user.userId;
  const thumbnailFile = req.file ? req.file.path : null;

  try {
    const query = `
      INSERT INTO courses (title, description, thumbnail_url, thumbnail_file, instructor_id, estimated_duration, learning_outcomes, skills_gained, difficulty_level, prerequisites_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await pool.query(query, [
      title, description, thumbnail_url, thumbnailFile, instructorId, 
      estimated_duration, learning_outcomes, skills_gained, difficulty_level, 
      prerequisites_enabled === 'true' || prerequisites_enabled === true
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating course' });
  }
});

app.post('/api/courses/lessons/:lessonId/complete', authMiddleware(), async (req, res) => {
  const { lessonId } = req.params;
  const studentId = req.user.userId;

  try {
    // Get course ID for this lesson
    const courseRes = await pool.query(`
      SELECT c.id as course_id 
      FROM lessons l 
      JOIN modules m ON l.module_id = m.id 
      JOIN courses c ON m.course_id = c.id 
      WHERE l.id = $1
    `, [lessonId]);

    if (courseRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
    const courseId = courseRes.rows[0].course_id;

    // Check enrollment
    const enrollRes = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    if (enrollRes.rows.length === 0) return res.status(403).json({ error: 'Not enrolled' });
    const enrollmentId = enrollRes.rows[0].id;

    // Insert or update lesson_progress
    const upsertQuery = `
      INSERT INTO lesson_progress (enrollment_id, lesson_id, is_completed)
      VALUES ($1, $2, true)
      ON CONFLICT (enrollment_id, lesson_id) 
      DO UPDATE SET is_completed = true, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(upsertQuery, [enrollmentId, lessonId]);

    const { checkAndMarkCourseCompletion } = require('./helpers/examValidation');
    await checkAndMarkCourseCompletion(courseId, studentId);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/lessons/:lessonId/document', async (req, res) => {
  const { lessonId } = req.params;
  const { download } = req.query;
  try {
    const result = await pool.query('SELECT document_file, title FROM lessons WHERE id = $1', [lessonId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
    
    const lesson = result.rows[0];
    if (!lesson.document_file) return res.status(404).json({ error: 'Document not found' });
    
    // Check if the document_file contains the full URL or just the path
    const docPath = lesson.document_file.replace(/\\/g, '/');
    let filePath;
    if (docPath.startsWith('uploads/')) {
      filePath = path.resolve(__dirname, docPath);
    } else {
      filePath = path.resolve(__dirname, 'uploads', docPath);
    }

    if (!require('fs').existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

    let ext = '.pdf';
    try {
      const buffer = Buffer.alloc(4);
      const fd = require('fs').openSync(filePath, 'r');
      require('fs').readSync(fd, buffer, 0, 4, 0);
      require('fs').closeSync(fd);
      
      const magic = buffer.toString('hex');
      if (buffer.toString('utf8', 0, 4) === '%PDF') ext = '.pdf';
      else if (magic === '504b0304') ext = '.zip'; // Used for docx, xlsx, pptx, zip
      else if (magic.startsWith('89504e47')) ext = '.png';
      else if (magic.startsWith('ffd8ff')) ext = '.jpg';
    } catch(e) {}

    const filename = `${lesson.title.replace(/[^a-zA-Z0-9 ]/g, '')}${ext}`;

    if (download === 'true') {
      res.download(filePath, filename);
    } else {
      if (ext !== '.pdf') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`
          <html><head><style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f1f5f9; color: #475569; }
            .container { text-align: center; }
            svg { width: 48px; height: 48px; margin-bottom: 1rem; color: #94a3b8; display: inline-block; }
            h3 { margin-bottom: 0.5rem; color: #1e293b; }
            p { font-size: 0.875rem; }
          </style></head><body>
            <div class="container">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3>Preview Not Available</h3>
              <p>This document format cannot be previewed in the browser.<br>Please use the Download button below.</p>
            </div>
          </body></html>
        `);
      }

      res.sendFile(filePath, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching document' });
  }
});

app.get('/api/courses/:courseId/progress', authMiddleware(), async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.userId;

  try {
    const enrollRes = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    if (enrollRes.rows.length === 0) return res.json({ completedLessons: 0, totalLessons: 0, progress: 0 });
    const enrollmentId = enrollRes.rows[0].id;

    const totalRes = await pool.query(`
      SELECT count(l.id) as total 
      FROM lessons l 
      JOIN modules m ON l.module_id = m.id 
      WHERE m.course_id = $1
    `, [courseId]);
    const totalLessons = parseInt(totalRes.rows[0].total) || 0;

    const completedRes = await pool.query(`
      SELECT count(lp.id) as completed 
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE lp.enrollment_id = $1 AND lp.is_completed = true AND m.course_id = $2
    `, [enrollmentId, courseId]);
    const completedLessons = parseInt(completedRes.rows[0].completed) || 0;

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Also fetch the specific completed lesson IDs so frontend can highlight them
    const completedIdsRes = await pool.query(`
      SELECT lesson_id FROM lesson_progress WHERE enrollment_id = $1 AND is_completed = true
    `, [enrollmentId]);
    const completedLessonIds = completedIdsRes.rows.map(r => r.lesson_id);

    res.json({ completedLessons, totalLessons, progress, completedLessonIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/courses/:id', authMiddleware(['INSTRUCTOR']), upload.single('thumbnail_file'), async (req, res) => {
  const { id } = req.params;
  const { title, description, thumbnail_url, is_published, estimated_duration, learning_outcomes, skills_gained, difficulty_level, prerequisites_enabled } = req.body;
  const instructorId = req.user.userId;
  const thumbnailFile = req.file ? req.file.path : undefined;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [id, instructorId]);
    if (courseCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    let updateFields = [];
    let values = [];
    let counter = 1;

    if (title !== undefined) { updateFields.push(`title = $${counter++}`); values.push(title); }
    if (description !== undefined) { updateFields.push(`description = $${counter++}`); values.push(description); }
    if (thumbnail_url !== undefined) { updateFields.push(`thumbnail_url = $${counter++}`); values.push(thumbnail_url); }
    if (thumbnailFile !== undefined) { updateFields.push(`thumbnail_file = $${counter++}`); values.push(thumbnailFile); }
    if (is_published !== undefined) {
      // If we are passing string "true" / "false" in FormData or json bool
      const pub = (is_published === 'true' || is_published === true);
      updateFields.push(`is_published = $${counter++}`); values.push(pub);
    }
    if (estimated_duration !== undefined) { updateFields.push(`estimated_duration = $${counter++}`); values.push(estimated_duration); }
    if (learning_outcomes !== undefined) { updateFields.push(`learning_outcomes = $${counter++}`); values.push(learning_outcomes); }
    if (skills_gained !== undefined) { updateFields.push(`skills_gained = $${counter++}`); values.push(skills_gained); }
    if (difficulty_level !== undefined) { updateFields.push(`difficulty_level = $${counter++}`); values.push(difficulty_level); }
    if (prerequisites_enabled !== undefined) { 
      const preq = (prerequisites_enabled === 'true' || prerequisites_enabled === true);
      updateFields.push(`prerequisites_enabled = $${counter++}`); values.push(preq); 
    }

    if (updateFields.length === 0) return res.json(courseCheck.rows[0]);

    const query = `
      UPDATE courses 
      SET ${updateFields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;
    values.push(id);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating course' });
  }
});

app.delete('/api/courses/:id', authMiddleware(['INSTRUCTOR']), async (req, res) => {
  const { id } = req.params;
  const instructorId = req.user.userId;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [id, instructorId]);
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or course not found' });
    }

    await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting course' });
  }
});

// Module routes
app.post('/api/courses/:courseId/modules', authMiddleware(['INSTRUCTOR']), createModule);
app.put('/api/courses/:courseId/modules/reorder', authMiddleware(['INSTRUCTOR']), reorderModules);

// Lesson routes
app.post('/api/courses/modules/:moduleId/lessons', authMiddleware(['INSTRUCTOR']), upload.any(), async (req, res) => {
  const { moduleId } = req.params;
  const { title, content_type, text_content, video_url, audio_url, image_url, document_url, order } = req.body;

  let video_file = null;
  let audio_file = null;
  let image_file = null;
  let document_file = null;
  let vtt_file = null;

  if (req.files) {
    req.files.forEach(f => {
      if (f.fieldname === 'video_file') video_file = f.path;
      if (f.fieldname === 'audio_file') audio_file = f.path;
      if (f.fieldname === 'image_file') image_file = f.path;
      if (f.fieldname === 'document_file') document_file = f.path;
      if (f.fieldname === 'vtt_file') vtt_file = f.path;
    });
  }

  try {
    const checkQuery = `
      SELECT c.instructor_id, c.id as course_id
      FROM modules m
      JOIN courses c ON m.course_id = c.id
      WHERE m.id = $1
    `;
    const checkResult = await pool.query(checkQuery, [moduleId]);

    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    if (checkResult.rows[0].instructor_id !== req.user.userId) return res.status(403).json({ error: 'Access denied' });

    const insertQuery = `
      INSERT INTO lessons (module_id, title, content_type, text_content, video_url, video_file, audio_url, audio_file, image_url, image_file, document_url, document_file, vtt_file, "order")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [
      moduleId, title, (content_type || 'TEXT').toUpperCase(), text_content, video_url, video_file, audio_url, audio_file, image_url, image_file, document_url, document_file, vtt_file, order || 0
    ]);

    await pool.query('UPDATE courses SET is_approved = false, is_published = false WHERE id = $1', [checkResult.rows[0].course_id]);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating lesson' });
  }
});

// Quiz routes
app.post('/api/courses/modules/:moduleId/quizzes', authMiddleware(['INSTRUCTOR']), createQuiz);
app.post('/api/courses/quizzes/:quizId/submit', authMiddleware(), submitQuiz);

// Questions
app.post('/api/courses/quizzes/:quizId/questions', authMiddleware(['INSTRUCTOR']), async (req, res) => {
  const { quizId } = req.params;
  const { text, question_type, option_a, option_b, option_c, option_d, correct_answers } = req.body;

  try {
    const insertQuery = `
      INSERT INTO questions (quiz_id, text, question_type, option_a, option_b, option_c, option_d, correct_answers)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [quizId, text, (question_type || 'SINGLE').toUpperCase(), option_a, option_b, option_c, option_d, correct_answers]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating question' });
  }
});

// Enrollment routes
app.post('/api/courses/:courseId/prerequisites', authMiddleware(), saveCoursePrerequisites);
app.post('/api/courses/:courseId/enroll', authMiddleware(), enrollCourse);

// Assessment routes
app.post('/api/courses/:courseId/assessments', authMiddleware(['INSTRUCTOR']), createAssessment);
app.post('/api/courses/assessments/:assessmentId/submit', authMiddleware(), upload.single('submission_file'), submitAssessment);
app.post('/api/courses/assessments/submissions/:submissionId/grade', authMiddleware(['INSTRUCTOR']), gradeSubmission);

// Certificate routes
app.post('/api/courses/:courseId/certificate', authMiddleware(), requestCertificate);

// Generic course ID route (Must be defined last to avoid shadowing other /api/courses/* routes)
app.get('/api/courses/:id', authMiddleware(), getCourseById);

// Leaderboard API
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { courseId } = req.query;
    let query = `
      SELECT 
        u.id, u.full_name, u.email, u.streak_count,
        (SELECT COUNT(*) FROM enrollments e2 WHERE e2.student_id = u.id) as courses_enrolled,
        (SELECT COUNT(*) FROM lesson_progress lp JOIN enrollments e3 ON lp.enrollment_id = e3.id WHERE e3.student_id = u.id AND lp.is_completed = true) as lessons_completed,
        (SELECT COUNT(*) FROM quiz_attempts qa JOIN enrollments e4 ON qa.enrollment_id = e4.id WHERE e4.student_id = u.id AND qa.passed = true) as quizzes_passed,
        (SELECT COUNT(*) FROM certificate_requests cr JOIN enrollments e5 ON cr.enrollment_id = e5.id WHERE e5.student_id = u.id AND cr.status = 'APPROVED') as courses_completed
      FROM users u
      WHERE u.role = 'LEARNER'
    `;
    let params = [];
    if (courseId) {
      query += ` AND EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = u.id AND e.course_id = $1)`;
      params.push(courseId);
    }

    query += ` ORDER BY quizzes_passed DESC, courses_completed DESC, lessons_completed DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- PUBLIC STATS ---
app.get('/api/public/stats', async (req, res) => {
  try {
    const activeUsersResult = await pool.query("SELECT COUNT(*) FROM users WHERE is_active = true");
    const publishedCoursesResult = await pool.query("SELECT COUNT(*) FROM courses WHERE is_published = true");
    const certificatesIssuedResult = await pool.query("SELECT COUNT(*) FROM certificate_requests WHERE status = 'APPROVED'");
    const expertInstructorsResult = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'INSTRUCTOR' AND is_active = true");

    res.json({
      activeUsers: parseInt(activeUsersResult.rows[0].count, 10),
      publishedCourses: parseInt(publishedCoursesResult.rows[0].count, 10),
      certificatesIssued: parseInt(certificatesIssuedResult.rows[0].count, 10),
      expertInstructors: parseInt(expertInstructorsResult.rows[0].count, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// --- SUBSCRIPTIONS & PLANS ---
app.get('/api/plans', async (req, res) => {
  try {
    const { plan_type } = req.query;
    let query = 'SELECT * FROM subscription_plans';
    let params = [];
    if (plan_type) {
      query += ' WHERE plan_type = $1';
      params.push(plan_type);
    }
    query += ' ORDER BY price ASC';
    const result = await pool.query(query, params);
    
    // Fetch features for each plan
    const plans = result.rows;
    for (let plan of plans) {
      const featuresRes = await pool.query('SELECT feature_name, feature_value FROM plan_features WHERE plan_id = $1', [plan.id]);
      plan.features = featuresRes.rows;
    }
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching plans' });
  }
});

app.post('/api/plans', authMiddleware(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { name, description, plan_type, price, billing_cycle, duration_months, features } = req.body;
    
    const insertPlan = await pool.query(
      'INSERT INTO subscription_plans (name, description, plan_type, price, billing_cycle, duration_months) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, plan_type || 'learner', price, billing_cycle || 'monthly', duration_months || 1]
    );
    const plan = insertPlan.rows[0];

    if (features && Array.isArray(features)) {
      for (let f of features) {
        await pool.query(
          'INSERT INTO plan_features (plan_id, feature_name, feature_value) VALUES ($1, $2, $3)',
          [plan.id, f.feature_name, f.feature_value]
        );
      }
    }
    res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating plan' });
  }
});

app.put('/api/plans/:id', authMiddleware(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, plan_type, price, billing_cycle, duration_months, features } = req.body;
    
    const updatePlan = await pool.query(
      'UPDATE subscription_plans SET name = $1, description = $2, plan_type = $3, price = $4, billing_cycle = $5, duration_months = $6 WHERE id = $7 RETURNING *',
      [name, description, plan_type || 'learner', price, billing_cycle || 'monthly', duration_months || 1, id]
    );

    if (updatePlan.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = updatePlan.rows[0];

    // Replace features
    await pool.query('DELETE FROM plan_features WHERE plan_id = $1', [id]);
    if (features && Array.isArray(features)) {
      for (let f of features) {
        await pool.query(
          'INSERT INTO plan_features (plan_id, feature_name, feature_value) VALUES ($1, $2, $3)',
          [plan.id, f.feature_name, f.feature_value]
        );
      }
    }
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating plan' });
  }
});

app.delete('/api/plans/:id', authMiddleware(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM subscription_plans WHERE id = $1', [id]);
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting plan' });
  }
});

app.get('/api/subscriptions/me', authMiddleware(), async (req, res) => {
  try {
    let query;
    let params;
    if (req.user.role === 'ORGANIZATION_ADMIN' && req.user.organization_id) {
       query = "SELECT s.*, p.name as plan_name, p.plan_type, p.price FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.organization_id = $1 AND s.status IN ('active', 'revoked') ORDER BY s.end_date DESC LIMIT 1";
       params = [req.user.organization_id];
    } else {
       query = "SELECT s.*, p.name as plan_name, p.plan_type, p.price FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.user_id = $1 AND s.status IN ('active', 'revoked') ORDER BY s.end_date DESC LIMIT 1";
       params = [req.user.userId];
    }

    const subRes = await pool.query(query, params);
    if (subRes.rows.length === 0) return res.json(null);
    
    const subscription = subRes.rows[0];
    const featuresRes = await pool.query('SELECT feature_name, feature_value FROM plan_features WHERE plan_id = $1', [subscription.plan_id]);
    subscription.features = featuresRes.rows;

    res.json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching subscription' });
  }
});

app.post('/api/subscriptions', authMiddleware(), async (req, res) => {
  try {
    const { plan_id } = req.body;
    // Mock Payment: Accept the plan_id and automatically subscribe the user
    
    const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    const isOrg = req.user.role === 'ORGANIZATION_ADMIN';
    const orgId = isOrg ? req.user.organization_id : null;
    const userId = req.user.userId;

    // Calculate end date based on duration_months
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    // End previous active subscriptions
    if (isOrg) {
      await pool.query('UPDATE subscriptions SET status = $1 WHERE organization_id = $2', ['expired', orgId]);
    } else {
      await pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['expired', userId]);
    }

    const insertSub = await pool.query(
      'INSERT INTO subscriptions (user_id, organization_id, plan_id, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, orgId, plan_id, endDate, 'active']
    );

    // If the plan is paid, log a real transaction in the payments table
    if (parseFloat(plan.price) > 0) {
      const transactionId = 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await pool.query(
        'INSERT INTO payments (user_id, amount, transaction_id, status) VALUES ($1, $2, $3, $4)',
        [userId, plan.price, transactionId, 'SUCCESS']
      );
    }

    // Reactivate users whose access might have been revoked previously
    if (isOrg) {
      await pool.query("UPDATE users SET is_active = true WHERE organization_id = $1 AND role IN ('LEARNER', 'INSTRUCTOR')", [orgId]);
    } else {
      await pool.query("UPDATE users SET is_active = true WHERE id = $1 AND role IN ('LEARNER', 'INSTRUCTOR')", [userId]);
    }

    res.status(201).json(insertSub.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error subscribing', details: err.message });
  }
});

// --- ANNOUNCEMENTS ---
const getAnnouncements = async (req, res) => {
  try {
    const orgId = req.user.organization_id || null;
    let query = "SELECT * FROM announcements WHERE ";
    let params = [];

    if (orgId) {
      query += "(organization_id = $1 OR organization_id IS NULL) AND id NOT IN (SELECT announcement_id FROM user_hidden_announcements WHERE user_id = $2)";
      params = [orgId, req.user.userId];
    } else {
      query += "organization_id IS NULL AND id NOT IN (SELECT announcement_id FROM user_hidden_announcements WHERE user_id = $1)";
      params = [req.user.userId];
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
};

app.get('/api/learner/announcements', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), getAnnouncements);
app.get('/api/instructor/announcements', authMiddleware(['INSTRUCTOR']), getAnnouncements);

app.post('/api/instructor/announcements', authMiddleware(['INSTRUCTOR']), async (req, res) => {
  const { title, content } = req.body;
  try {
    const orgIdRes = await pool.query("SELECT organization_id FROM users WHERE id = $1", [req.user.userId]);
    const orgId = orgIdRes.rows[0]?.organization_id || null;
    const result = await pool.query(
      "INSERT INTO announcements (organization_id, title, content, author_role, author_id) VALUES ($1, $2, $3, 'INSTRUCTOR', $4) RETURNING *",
      [orgId, title, content, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating announcement' });
  }
});

app.put('/api/instructor/announcements/:id', authMiddleware(['INSTRUCTOR']), async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "UPDATE announcements SET title = $1, content = $2 WHERE id = $3 AND author_id = $4 RETURNING *",
      [title, content, id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating announcement' });
  }
});

app.delete('/api/instructor/announcements/:id', authMiddleware(['INSTRUCTOR']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM announcements WHERE id = $1 AND author_id = $2 RETURNING id",
      [id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting announcement' });
  }
});
app.get('/api/admin/announcements', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM announcements WHERE author_role = 'SUPER_ADMIN' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
});

app.post('/api/admin/announcements', authMiddleware(['ADMIN']), async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO announcements (title, content, author_role, author_id) VALUES ($1, $2, 'SUPER_ADMIN', $3) RETURNING *",
      [title, content, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating announcement' });
  }
});

app.put('/api/admin/announcements/:id', authMiddleware(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "UPDATE announcements SET title = $1, content = $2 WHERE id = $3 AND author_role = 'SUPER_ADMIN' RETURNING *",
      [title, content, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating announcement' });
  }
});

app.delete('/api/admin/announcements/:id', authMiddleware(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM announcements WHERE id = $1 AND author_role = 'SUPER_ADMIN' RETURNING id",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting announcement' });
  }
});

const globalPracticeRoutes = require('./globalPracticeRoutes');
const adminReportsRoutes = require('./adminReportsRoutes');
const examRoutes = require('./examRoutes');
const contactRoutes = require('./contactRoutes');
app.use('/api/chat', authMiddleware(), chatRoutes(upload));
app.use('/api/org-admin', orgAdmin(authMiddleware));
app.use('/api/search', authMiddleware(), searchRoutes());
app.use('/api/practice-arenas', globalPracticeRoutes(authMiddleware));
app.use('/api/admin/reports', adminReportsRoutes(authMiddleware));
app.use('/api/exams', examRoutes(authMiddleware));
app.use('/api/contact', contactRoutes(authMiddleware));

// Auto-create contact_queries table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS contact_queries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    reply_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.error('Error creating contact_queries table:', err));

// SERVER LISTEN

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
socketManager.initSocket(server);
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
