const pool = require('./db');

const logActivity = async (client, examId, userId, action, details = {}) => {
  try {
    await client.query(
      'INSERT INTO course_exam_activity_logs (exam_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [examId, userId, action, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

// ==========================================
// INSTRUCTOR ROUTES
// ==========================================

const createExam = async (req, res) => {
  const { courseId } = req.params;
  const { title, description, duration_minutes, pass_percentage, attempt_limit, instructions } = req.body;
  const instructorId = req.user.userId;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, instructorId]);
    if (courseCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    await pool.query('BEGIN');

    const insertRes = await pool.query(`
      INSERT INTO course_exams (course_id, title, description, duration_minutes, pass_percentage, attempt_limit, instructions, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PUBLISHED')
      RETURNING *
    `, [courseId, title, description, duration_minutes || 60, pass_percentage || 60, attempt_limit || 1, instructions, instructorId]);
    
    const newExam = insertRes.rows[0];

    await pool.query(`
      INSERT INTO course_exam_settings (exam_id) VALUES ($1)
    `, [newExam.id]);

    await logActivity(pool, newExam.id, instructorId, 'EXAM_CREATED');
    await pool.query('COMMIT');

    res.status(201).json(newExam);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCourseExams = async (req, res) => {
  const { courseId } = req.params;
  const instructorId = req.user.userId;

  try {
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, instructorId]);
    if (courseCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    const examsRes = await pool.query('SELECT * FROM course_exams WHERE course_id = $1 AND is_deleted = false ORDER BY created_at DESC', [courseId]);
    res.json(examsRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getStudentCourseExam = async (req, res) => {
  const { courseId } = req.params;
  try {
    const examsRes = await pool.query('SELECT * FROM course_exams WHERE course_id = $1 AND is_deleted = false ORDER BY created_at DESC', [courseId]);
    res.json(examsRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteExam = async (req, res) => {
  const { examId } = req.params;
  const instructorId = req.user.userId;

  try {
    const examRes = await pool.query(`
      SELECT e.* FROM course_exams e 
      JOIN courses c ON e.course_id = c.id 
      WHERE e.id = $1 AND c.instructor_id = $2
    `, [examId, instructorId]);

    if (examRes.rows.length === 0) return res.status(403).json({ error: 'Access denied or not found' });

    await pool.query('UPDATE course_exams SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [examId]);
    await logActivity(pool, examId, instructorId, 'EXAM_DELETED');

    res.json({ message: 'Exam soft-deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateExamSettings = async (req, res) => {
  const { examId } = req.params;
  const instructorId = req.user.userId;
  const { shuffle_questions, shuffle_options, show_result_immediately, allow_review, require_manual_review, enable_negative_marking, allow_resume } = req.body;

  try {
    const examRes = await pool.query(`
      SELECT e.* FROM course_exams e 
      JOIN courses c ON e.course_id = c.id 
      WHERE e.id = $1 AND c.instructor_id = $2 AND e.is_deleted = false
    `, [examId, instructorId]);

    if (examRes.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    const updateRes = await pool.query(`
      UPDATE course_exam_settings 
      SET shuffle_questions = COALESCE($1, shuffle_questions),
          shuffle_options = COALESCE($2, shuffle_options),
          show_result_immediately = COALESCE($3, show_result_immediately),
          allow_review = COALESCE($4, allow_review),
          require_manual_review = COALESCE($5, require_manual_review),
          enable_negative_marking = COALESCE($6, enable_negative_marking),
          allow_resume = COALESCE($7, allow_resume)
      WHERE exam_id = $8
      RETURNING *
    `, [shuffle_questions, shuffle_options, show_result_immediately, allow_review, require_manual_review, enable_negative_marking, allow_resume, examId]);

    await logActivity(pool, examId, instructorId, 'EXAM_SETTINGS_UPDATED');

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const publishExam = async (req, res) => {
  const { examId } = req.params;
  const instructorId = req.user.userId;

  try {
    const examRes = await pool.query(`
      SELECT e.* FROM course_exams e 
      JOIN courses c ON e.course_id = c.id 
      WHERE e.id = $1 AND c.instructor_id = $2 AND e.is_deleted = false
    `, [examId, instructorId]);

    if (examRes.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    // Publish Validation
    const sectionsRes = await pool.query('SELECT id FROM course_exam_sections WHERE exam_id = $1 AND is_deleted = false', [examId]);
    if (sectionsRes.rows.length === 0) return res.status(400).json({ error: 'Exam must have at least one section.' });

    const sectionIds = sectionsRes.rows.map(s => s.id);
    const questionsRes = await pool.query('SELECT id, marks FROM course_exam_questions WHERE section_id = ANY($1)', [sectionIds]);
    
    if (questionsRes.rows.length === 0) return res.status(400).json({ error: 'Exam must have at least one question.' });

    const totalMarks = questionsRes.rows.reduce((sum, q) => sum + q.marks, 0);
    if (totalMarks <= 0) return res.status(400).json({ error: 'Exam total marks must be greater than 0.' });

    // Update Status
    await pool.query("UPDATE course_exams SET status = 'PUBLISHED' WHERE id = $1", [examId]);
    await logActivity(pool, examId, instructorId, 'EXAM_PUBLISHED');

    res.json({ message: 'Exam published successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getReviewPending = async (req, res) => {
  const instructorId = req.user.userId;
  try {
    const query = `
      SELECT a.*, q.question_text, q.question_type, att.student_id, att.exam_id, u.full_name, c.title as exam_title
      FROM course_exam_answers a
      JOIN course_exam_attempts att ON a.attempt_id = att.id
      JOIN course_exam_questions q ON a.question_id = q.id
      JOIN course_exams c ON att.exam_id = c.id
      JOIN courses crs ON c.course_id = crs.id
      JOIN users u ON att.student_id = u.id
      WHERE crs.instructor_id = $1 
        AND a.review_status = 'PENDING' 
        AND q.question_type IN ('descriptive', 'coding')
        AND att.status = 'UNDER_REVIEW'
    `;
    const result = await pool.query(query, [instructorId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const submitExamReview = async (req, res) => {
  const { answerId } = req.params;
  const { score } = req.body;
  const instructorId = req.user.userId;

  try {
    const authCheck = await pool.query(`
      SELECT a.attempt_id 
      FROM course_exam_answers a
      JOIN course_exam_attempts att ON a.attempt_id = att.id
      JOIN course_exams c ON att.exam_id = c.id
      JOIN courses crs ON c.course_id = crs.id
      WHERE a.id = $1 AND crs.instructor_id = $2
    `, [answerId, instructorId]);

    if (authCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied or answer not found' });
    
    const attemptId = authCheck.rows[0].attempt_id;

    await pool.query(
      "UPDATE course_exam_answers SET score = $1, is_correct = true, review_status = 'GRADED' WHERE id = $2",
      [score, answerId]
    );

    const pendingCheck = await pool.query(
      "SELECT count(id) FROM course_exam_answers WHERE attempt_id = $1 AND review_status = 'PENDING'",
      [attemptId]
    );

    if (parseInt(pendingCheck.rows[0].count) === 0) {
      const manualSumRes = await pool.query(`
        SELECT COALESCE(SUM(score), 0) as manual_total 
        FROM course_exam_answers 
        WHERE attempt_id = $1 AND review_status = 'GRADED'
      `, [attemptId]);
      
      const manualTotal = parseFloat(manualSumRes.rows[0].manual_total);

      const attemptDetails = await pool.query(`
        SELECT a.auto_score, e.pass_percentage, 
               (SELECT COALESCE(SUM(marks), 100) FROM course_exam_questions q 
                JOIN course_exam_sections s ON q.section_id = s.id 
                WHERE s.exam_id = e.id AND q.is_deleted = false) as total_exam_marks
        FROM course_exam_attempts a
        JOIN course_exams e ON a.exam_id = e.id
        WHERE a.id = $1
      `, [attemptId]);

      const details = attemptDetails.rows[0];
      const totalScore = parseFloat(details.auto_score || 0) + manualTotal;
      const totalExamMarks = parseFloat(details.total_exam_marks || 100);
      const percentage = (totalScore / totalExamMarks) * 100;
      const finalStatus = percentage >= parseFloat(details.pass_percentage || 0) ? 'PASSED' : 'FAILED';

      await pool.query(`
        UPDATE course_exam_attempts 
        SET manual_score = $1, 
            total_score = $2, 
            status = $3,
            evaluated_at = NOW()
        WHERE id = $4
      `, [manualTotal, totalScore, finalStatus, attemptId]);
    }

    res.json({ message: 'Review submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getExamAttemptsList = async (req, res) => {
  const { examId } = req.params;
  const instructorId = req.user.userId;

  try {
    const authCheck = await pool.query(`
      SELECT e.id FROM course_exams e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = $1 AND c.instructor_id = $2
    `, [examId, instructorId]);

    if (authCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    const attempts = await pool.query(`
      SELECT a.*, u.full_name, u.email 
      FROM course_exam_attempts a
      JOIN users u ON a.student_id = u.id
      WHERE a.exam_id = $1
      ORDER BY a.started_at DESC
    `, [examId]);

    res.json(attempts.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching attempts' });
  }
};

const getDetailedAttemptReview = async (req, res) => {
  const { attemptId } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role; // Assume role is accessible

  try {
    // Basic attempt details
    const attemptRes = await pool.query(`
      SELECT a.*, u.full_name, u.email, e.title as exam_title, e.pass_percentage
      FROM course_exam_attempts a
      JOIN users u ON a.student_id = u.id
      JOIN course_exams e ON a.exam_id = e.id
      WHERE a.id = $1
    `, [attemptId]);

    if (attemptRes.rows.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attemptRes.rows[0];

    // Access control: Only instructor of the course OR the student who took it
    if (userRole === 'LEARNER' || userRole === 'STUDENT' || userRole === 'EMPLOYEE') {
      if (attempt.student_id !== userId) return res.status(403).json({ error: 'Access denied' });
    } else if (userRole === 'INSTRUCTOR') {
      const authCheck = await pool.query(`
        SELECT c.instructor_id FROM course_exams e
        JOIN courses c ON e.course_id = c.id
        WHERE e.id = $1
      `, [attempt.exam_id]);
      if (authCheck.rows[0].instructor_id !== userId) return res.status(403).json({ error: 'Access denied' });
    }

    // Get sections
    const sectionsRes = await pool.query('SELECT * FROM course_exam_sections WHERE exam_id = $1 AND is_deleted = false ORDER BY id ASC', [attempt.exam_id]);
    const sections = sectionsRes.rows;
    
    const sectionIds = sections.map(s => s.id);
    let questions = [];
    let options = [];
    
    if (sectionIds.length > 0) {
      const qRes = await pool.query('SELECT * FROM course_exam_questions WHERE section_id = ANY($1) AND is_deleted = false ORDER BY id ASC', [sectionIds]);
      questions = qRes.rows;
      
      const qIds = questions.map(q => q.id);
      if (qIds.length > 0) {
        const oRes = await pool.query('SELECT * FROM course_exam_options WHERE question_id = ANY($1) ORDER BY id ASC', [qIds]);
        options = oRes.rows;
      }
    }

    // Get student answers
    const answersRes = await pool.query('SELECT * FROM course_exam_answers WHERE attempt_id = $1', [attempt.id]);
    const answers = answersRes.rows;
    
    for (let q of questions) {
      q.options = options.filter(o => o.question_id === q.id);
      let studentAns = answers.find(a => a.question_id === q.id) || null;
      if (studentAns && studentAns.answer_text && (q.question_type === 'single_mcq' || q.question_type === 'multiple_mcq')) {
        const selectedOptionIds = studentAns.answer_text.split(',').map(id => id.trim());
        const selectedOptions = q.options.filter(o => selectedOptionIds.includes(o.id.toString()));
        if (selectedOptions.length > 0) {
          studentAns.answer_text = selectedOptions.map(o => o.option_text).join(', ');
        }
      }
      q.student_answer = studentAns;
    }
    
    for (let s of sections) {
      s.questions = questions.filter(q => q.section_id === s.id);
      s.total_marks = s.questions.reduce((sum, q) => sum + parseFloat(q.marks || 0), 0);
      s.student_score = s.questions.reduce((sum, q) => sum + (q.student_answer ? parseFloat(q.student_answer.score || 0) : 0), 0);
    }
    
    res.json({ attempt, sections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching attempt review' });
  }
};

// ==========================================
// STUDENT ROUTES
// ==========================================
const { canUnlockExam } = require('./helpers/examValidation');

const getAvailableExams = async (req, res) => {
  const studentId = req.user.userId;
  try {
    // Get enrollments
    const enrollments = await pool.query('SELECT course_id FROM enrollments WHERE student_id = $1', [studentId]);
    if (enrollments.rows.length === 0) return res.json([]);

    const courseIds = enrollments.rows.map(r => r.course_id);
    
    // Find published exams for these courses
    const examsRes = await pool.query(`
      SELECT * FROM course_exams 
      WHERE course_id = ANY($1) AND status = 'PUBLISHED' AND is_deleted = false
    `, [courseIds]);

    const availableExams = [];
    for (let exam of examsRes.rows) {
      const validation = await canUnlockExam(exam.course_id, studentId);
      exam.is_unlocked = validation.unlocked;
      exam.lock_reason = validation.reason;
      
      const attemptsRes = await pool.query(`
        SELECT count(id) as attempt_count, max(total_score) as best_score,
               sum(case when status = 'IN_PROGRESS' then 1 else 0 end) as active_attempts,
               (SELECT id FROM course_exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status != 'IN_PROGRESS' ORDER BY started_at DESC LIMIT 1) as latest_attempt_id,
               (SELECT status FROM course_exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status != 'IN_PROGRESS' ORDER BY started_at DESC LIMIT 1) as latest_status
        FROM course_exam_attempts
        WHERE exam_id = $1 AND student_id = $2
      `, [exam.id, studentId]);

      exam.attempts = attemptsRes.rows[0];
      availableExams.push(exam);
    }

    res.json(availableExams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getExamPreview = async (req, res) => {
  const { examId } = req.params;
  try {
    const qRes = await pool.query(`
      SELECT q.question_type
      FROM course_exam_questions q
      JOIN course_exam_sections s ON q.section_id = s.id
      WHERE s.exam_id = $1 AND q.is_deleted = false
    `, [examId]);
    
    let mcqCount = 0;
    let fillBlankCount = 0;
    let codingCount = 0;
    let descriptiveCount = 0;
    
    qRes.rows.forEach(q => {
      if (q.question_type === 'single_mcq' || q.question_type === 'multiple_mcq') mcqCount++;
      else if (q.question_type === 'fill_blank') fillBlankCount++;
      else if (q.question_type === 'coding') codingCount++;
      else if (q.question_type === 'descriptive') descriptiveCount++;
    });
    
    res.json({ mcqCount, fillBlankCount, codingCount, descriptiveCount, totalQuestions: qRes.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching preview' });
  }
};

const startAttempt = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user.userId;

  try {
    const examRes = await pool.query("SELECT * FROM course_exams WHERE id = $1 AND status = 'PUBLISHED' AND is_deleted = false", [examId]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found or not published' });
    const exam = examRes.rows[0];

    const validation = await canUnlockExam(exam.course_id, studentId);
    if (!validation.unlocked) return res.status(403).json({ error: validation.reason });

    // Check active attempts (Resume functionality)
    const activeCheck = await pool.query("SELECT * FROM course_exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status = 'IN_PROGRESS'", [examId, studentId]);
    if (activeCheck.rows.length > 0) {
      return res.status(200).json(activeCheck.rows[0]);
    }

    const totalAttempts = await pool.query('SELECT count(id) FROM course_exam_attempts WHERE exam_id = $1 AND student_id = $2', [examId, studentId]);
    const attemptNumber = parseInt(totalAttempts.rows[0].count) + 1;

    if (attemptNumber > exam.attempt_limit) return res.status(403).json({ error: 'Attempt limit reached.' });

    let attemptRow;
    try {
      const insertAttempt = await pool.query(`
        INSERT INTO course_exam_attempts (exam_id, student_id, exam_version, attempt_number, status)
        VALUES ($1, $2, $3, $4, 'IN_PROGRESS') RETURNING *
      `, [examId, studentId, exam.version_number, attemptNumber]);
      attemptRow = insertAttempt.rows[0];
      await logActivity(pool, examId, studentId, 'ATTEMPT_STARTED', { attempt_id: attemptRow.id });
    } catch (insertErr) {
      if (insertErr.code === '23505') {
        const checkAgain = await pool.query("SELECT * FROM course_exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status = 'IN_PROGRESS'", [examId, studentId]);
        if (checkAgain.rows.length > 0) {
          attemptRow = checkAgain.rows[0];
        } else {
          throw insertErr;
        }
      } else {
        throw insertErr;
      }
    }
    res.status(201).json(attemptRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getExamAttemptData = async (req, res) => {
  const { attemptId } = req.params;
  const studentId = req.user.userId;

  try {
    const attemptRes = await pool.query('SELECT * FROM course_exam_attempts WHERE id = $1 AND student_id = $2', [attemptId, studentId]);
    if (attemptRes.rows.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attemptRes.rows[0];

    const examRes = await pool.query('SELECT * FROM course_exams WHERE id = $1', [attempt.exam_id]);
    const exam = examRes.rows[0];

    const sectionsRes = await pool.query('SELECT * FROM course_exam_sections WHERE exam_id = $1 AND is_deleted = false ORDER BY id ASC', [exam.id]);
    const sections = sectionsRes.rows;
    
    const sectionIds = sections.map(s => s.id);
    let questions = [];
    let options = [];
    
    let codingDetails = [];
    let testCases = [];
    
    if (sectionIds.length > 0) {
      const qRes = await pool.query('SELECT * FROM course_exam_questions WHERE section_id = ANY($1) AND is_deleted = false ORDER BY id ASC', [sectionIds]);
      questions = qRes.rows;
      
      const qIds = questions.map(q => q.id);
      if (qIds.length > 0) {
        // Exclude is_correct to prevent cheating!
        const oRes = await pool.query('SELECT id, question_id, option_text FROM course_exam_options WHERE question_id = ANY($1) ORDER BY id ASC', [qIds]);
        options = oRes.rows;
        
        const cdRes = await pool.query('SELECT * FROM course_exam_coding_details WHERE question_id = ANY($1)', [qIds]);
        codingDetails = cdRes.rows;
        
        const tcRes = await pool.query('SELECT id, question_id, stdin, expected_output, is_hidden FROM course_exam_coding_test_cases WHERE question_id = ANY($1)', [qIds]);
        testCases = tcRes.rows.map(tc => {
            if (tc.is_hidden) {
               return { id: tc.id, question_id: tc.question_id, is_hidden: true }; // Hide details
            }
            return tc;
        });
      }
    }
    
    for (let q of questions) {
      if (q.question_type === 'coding') {
          q.coding_details = codingDetails.find(cd => cd.question_id === q.id) || null;
          q.test_cases = testCases.filter(tc => tc.question_id === q.id);
      } else {
          q.options = options.filter(o => o.question_id === q.id);
      }
    }
    
    for (let s of sections) {
      s.questions = questions.filter(q => q.section_id == s.id);
    }
    
    exam.sections = sections;
    res.json({ attempt, exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching attempt data' });
  }
};

const submitExamAttempt = async (req, res) => {
  const { attemptId } = req.params;
  const studentId = req.user.userId;
  const { answers } = req.body; // Array of { question_id, answer_text }

  try {
    await pool.query('BEGIN');
    const attemptRes = await pool.query("SELECT * FROM course_exam_attempts WHERE id = $1 AND student_id = $2 AND status = 'IN_PROGRESS'", [attemptId, studentId]);
    if (attemptRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or already submitted attempt' });
    }
    const attempt = attemptRes.rows[0];
    const examId = attempt.exam_id;

    const examQuery = await pool.query('SELECT pass_percentage FROM course_exams WHERE id = $1', [examId]);
    const exam = examQuery.rows[0];

    const qRes = await pool.query(`
      SELECT q.*, 
             (SELECT json_agg(o.*) FROM course_exam_options o WHERE o.question_id = q.id) as options,
             (SELECT row_to_json(cd.*) FROM course_exam_coding_details cd WHERE cd.question_id = q.id) as coding_details,
             (SELECT json_agg(tc.*) FROM course_exam_coding_test_cases tc WHERE tc.question_id = q.id) as test_cases
      FROM course_exam_questions q
      JOIN course_exam_sections s ON q.section_id = s.id
      WHERE s.exam_id = $1 AND q.is_deleted = false
    `, [examId]);
    const questions = qRes.rows;

    let totalAutoScore = 0;
    let requiresManualReview = false;

    for (let ans of answers) {
      const q = questions.find(qu => qu.id === ans.question_id);
      if (!q) continue;

      let score = 0;
      let isCorrect = false;
      let reviewStatus = 'GRADED';

      if (q.question_type === 'single_mcq' || q.question_type === 'multiple_mcq') {
        const selectedOptionIds = ans.answer_text ? ans.answer_text.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)).sort() : [];
        const correctOptions = (q.options || []).filter(o => o.is_correct).map(o => o.id).sort();
        
        isCorrect = (selectedOptionIds.length === correctOptions.length) && selectedOptionIds.every((val, index) => val === correctOptions[index]);
        if (isCorrect) score = q.marks;
      } else if (q.question_type === 'fill_blank') {
        const correctOpt = (q.options || []).find(o => o.is_correct);
        if (correctOpt && ans.answer_text && ans.answer_text.trim().toLowerCase() === correctOpt.option_text.trim().toLowerCase()) {
          isCorrect = true;
          score = q.marks;
        }
      } else if (q.question_type === 'descriptive') {
        reviewStatus = 'PENDING';
        requiresManualReview = true;
      } else if (q.question_type === 'coding') {
        let code = ans.answer_text || '';
        let lang = q.coding_details?.language || 'python';
        if (code.startsWith('{"lang":')) {
          try {
            const parsed = JSON.parse(code);
            code = parsed.code;
            lang = parsed.lang;
          } catch (e) {}
        }
        let passedAll = true;
        if (!code.trim() || !q.coding_details || !q.test_cases || q.test_cases.length === 0) {
          passedAll = false;
        } else {
          //  single container
          try {
            const { executeAllTestCases } = require('./utils/codeExecutor');
            const stdins = q.test_cases.map(tc => tc.stdin || '');
            const results = await executeAllTestCases(lang, code, stdins);
            for (let i = 0; i < q.test_cases.length; i++) {
              const actual = results[i].stdout.replace(/\r\n/g, '\n').trim();
              const expected = (q.test_cases[i].expected_output || '').replace(/\r\n/g, '\n').trim();
              if (actual !== expected) {
                passedAll = false;
                break;
              }
            }
          } catch (execErr) {
            passedAll = false;
          }
        }
        
        if (passedAll) {
          isCorrect = true;
          score = q.marks;
        }
        reviewStatus = 'GRADED';
      }

      totalAutoScore += score;

      await pool.query(`
        INSERT INTO course_exam_answers (attempt_id, question_id, answer_text, score, is_correct, review_status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [attempt.id, q.id, ans.answer_text || '', score, isCorrect, reviewStatus]);
    }

    let finalStatus = 'UNDER_REVIEW';

    if (!requiresManualReview) {
      const totalMarks = questions.reduce((sum, q) => sum + parseFloat(q.marks || 0), 0) || 100;
      const percentage = (totalAutoScore / totalMarks) * 100;
      finalStatus = percentage >= parseFloat(exam.pass_percentage || 0) ? 'PASSED' : 'FAILED';
    }

    const updateRes = await pool.query(`
      UPDATE course_exam_attempts 
      SET status = $1, auto_score = $2, total_score = $3, submitted_at = NOW()
      WHERE id = $4 RETURNING *
    `, [finalStatus, totalAutoScore, totalAutoScore, attempt.id]);

    await pool.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error submitting attempt' });
  }
};

// ==========================================
// BUILDER ROUTES
// ==========================================
const getExamBuilder = async (req, res) => {
  const { examId } = req.params;
  const instructorId = req.user.userId;
  
  try {
    const examRes = await pool.query('SELECT e.* FROM course_exams e JOIN courses c ON e.course_id = c.id WHERE e.id = $1 AND c.instructor_id = $2 AND e.is_deleted = false', [examId, instructorId]);
    if (examRes.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    
    const exam = examRes.rows[0];
    
    const sectionsRes = await pool.query('SELECT * FROM course_exam_sections WHERE exam_id = $1 AND is_deleted = false ORDER BY id ASC', [examId]);
    const sections = sectionsRes.rows;
    
    const sectionIds = sections.map(s => s.id);
    let questions = [];
    let options = [];
    
    let codingDetails = [];
    let testCases = [];

    if (sectionIds.length > 0) {
      const qRes = await pool.query('SELECT * FROM course_exam_questions WHERE section_id = ANY($1) AND is_deleted = false ORDER BY id ASC', [sectionIds]);
      questions = qRes.rows;
      
      const qIds = questions.map(q => q.id);
      if (qIds.length > 0) {
        const oRes = await pool.query('SELECT * FROM course_exam_options WHERE question_id = ANY($1) ORDER BY id ASC', [qIds]);
        options = oRes.rows;

        const cdRes = await pool.query('SELECT * FROM course_exam_coding_details WHERE question_id = ANY($1)', [qIds]);
        codingDetails = cdRes.rows;
        
        const tcRes = await pool.query('SELECT id, question_id, stdin, expected_output, is_hidden FROM course_exam_coding_test_cases WHERE question_id = ANY($1)', [qIds]);
        testCases = tcRes.rows;
      }
    }
    
    for (let q of questions) {
      if (q.question_type === 'coding') {
          q.coding_details = codingDetails.find(cd => cd.question_id === q.id) || null;
          q.test_cases = testCases.filter(tc => tc.question_id === q.id);
      } else {
          q.options = options.filter(o => o.question_id === q.id);
      }
    }
    
    for (let s of sections) {
      s.questions = questions.filter(q => q.section_id === s.id);
    }
    
    exam.sections = sections;
    res.json(exam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching builder data' });
  }
};

const addExamSection = async (req, res) => {
  const { examId } = req.params;
  const { title, description } = req.body;
  try {
    const resSec = await pool.query('INSERT INTO course_exam_sections (exam_id, title, description) VALUES ($1, $2, $3) RETURNING *', [examId, title, description]);
    res.status(201).json(resSec.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating section' });
  }
};

const addExamQuestion = async (req, res) => {
  const { sectionId } = req.params;
  const { question_text, question_type, marks, options, language, starter_code, test_cases } = req.body;
  try {
    await pool.query('BEGIN');
    
    const qRes = await pool.query(`
      INSERT INTO course_exam_questions (section_id, question_text, question_type, marks) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [sectionId, question_text, question_type, marks]);
    
    const question = qRes.rows[0];
    question.options = [];
    question.test_cases = [];
    
    if (question_type === 'coding') {
      const cdRes = await pool.query(`
        INSERT INTO course_exam_coding_details (question_id, language, starter_code)
        VALUES ($1, $2, $3) RETURNING *
      `, [question.id, language, starter_code]);
      question.coding_details = cdRes.rows[0];

      if (test_cases && test_cases.length > 0) {
        for (let tc of test_cases) {
          const tcRes = await pool.query(`
            INSERT INTO course_exam_coding_test_cases (question_id, stdin, expected_output, is_hidden)
            VALUES ($1, $2, $3, $4) RETURNING *
          `, [question.id, tc.stdin, tc.expected_output, tc.is_hidden || false]);
          question.test_cases.push(tcRes.rows[0]);
        }
      }
    } else {
      if (options && options.length > 0) {
        for (let opt of options) {
          const oRes = await pool.query(`
            INSERT INTO course_exam_options (question_id, option_text, is_correct)
            VALUES ($1, $2, $3) RETURNING *
          `, [question.id, opt.option_text, opt.is_correct]);
          question.options.push(oRes.rows[0]);
        }
      }
    }
    
    await pool.query('COMMIT');
    res.status(201).json(question);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error creating question' });
  }
};

const deleteExamQuestion = async (req, res) => {
  const { questionId } = req.params;
  try {
    await pool.query('UPDATE course_exam_questions SET is_deleted = true WHERE id = $1', [questionId]);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting question' });
  }
};

let executeCode;
try {
  const codeExecutor = require('./utils/codeExecutor');
  executeCode = codeExecutor.executeCode;
} catch (e) {
  // Mock if utils/codeExecutor doesn't exist to prevent crash
  executeCode = async () => ({ stdout: 'Mock output', stderr: '' });
}

const executeStudentCode = async (req, res) => {
  const { language, code, stdin } = req.body;
  try {
    const result = await executeCode(language, code, stdin);
    res.json(result);
  } catch (err) {
    console.error('Code execution error:', err);
    res.status(500).json({ error: 'Failed to execute code' });
  }
};

module.exports = {
  createExam,
  getCourseExams,
  getStudentCourseExam,
  deleteExam,
  updateExamSettings,
  publishExam,
  getReviewPending,
  getAvailableExams,
  startAttempt,
  getExamAttemptData,
  submitExamAttempt,
  getExamBuilder,
  addExamSection,
  addExamQuestion,
  deleteExamQuestion,
  submitExamReview,
  getExamAttemptsList,
  getDetailedAttemptReview,
  executeStudentCode,
  getExamPreview
};
