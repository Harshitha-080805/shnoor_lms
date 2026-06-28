const pool = require('../db');

/**
 * @param {string|number} courseId
 * @param {string|number} studentId
 * @returns {Promise<{canRequest: boolean, reason?: string}>}
 */
const canRequestCertificate = async (courseId, studentId) => {
  try {
    const enrollRes = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    if (enrollRes.rows.length === 0) {
      return { canRequest: false, reason: 'Not enrolled in this course.' };
    }
    const enrollmentId = enrollRes.rows[0].id;

    // Check lesson progress
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

    if (totalLessons > 0 && completedLessons < totalLessons) {
      return { canRequest: false, reason: 'Please complete all lessons first.' };
    }

    const examRes = await pool.query(`
      SELECT id FROM course_exams 
      WHERE course_id = $1 AND status = 'PUBLISHED' AND is_deleted = false
    `, [courseId]);

    if (examRes.rows.length > 0) {
      const examId = examRes.rows[0].id;
      const attemptRes = await pool.query(`
        SELECT id FROM course_exam_attempts
        WHERE exam_id = $1 AND student_id = $2 AND status = 'PASSED'
      `, [examId, studentId]);

      if (attemptRes.rows.length === 0) {
        return { canRequest: false, reason: 'You must pass the final course exam before requesting a certificate.' };
      }
    }

    return { canRequest: true };
  } catch (err) {
    console.error('Error in canRequestCertificate validation:', err);
    return { canRequest: false, reason: 'Server error during validation.' };
  }
};

/**
 * @param {string|number} courseId
 * @param {string|number} studentId
 * @returns {Promise<{unlocked: boolean, reason?: string}>}
 */
const canUnlockExam = async (courseId, studentId) => {
  try {
    const enrollRes = await pool.query('SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    if (enrollRes.rows.length === 0) {
      return { unlocked: false, reason: 'Not enrolled in this course.' };
    }
    const enrollmentId = enrollRes.rows[0].id;

    // Check if all lessons are completed
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

    if (totalLessons > 0 && completedLessons < totalLessons) {
      return { unlocked: false, reason: 'All lessons must be completed to unlock the exam.' };
    }

    // Check mandatory quizzes 
    const quizzesRes = await pool.query(`
      SELECT q.id FROM quizzes q
      JOIN modules m ON q.module_id = m.id
      WHERE m.course_id = $1 AND m.title != 'Final Quiz'
    `, [courseId]);

    const quizIds = quizzesRes.rows.map(q => q.id);
    if (quizIds.length > 0) {
      const attemptsRes = await pool.query(`
        SELECT DISTINCT quiz_id FROM quiz_attempts
        WHERE enrollment_id = $1 AND passed = true AND quiz_id = ANY($2)
      `, [enrollmentId, quizIds]);
      
      const passedQuizIds = attemptsRes.rows.map(a => a.quiz_id);
      if (passedQuizIds.length < quizIds.length) {
        return { unlocked: false, reason: 'All mandatory quizzes must be passed to unlock the exam.' };
      }
    }

    return { unlocked: true };
  } catch (err) {
    console.error('Error in canUnlockExam validation:', err);
    return { unlocked: false, reason: 'Server error during validation.' };
  }
};

const checkAndMarkCourseCompletion = async (courseId, studentId) => {
  try {
    const enrollRes = await pool.query('SELECT id, completed_at FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
    if (enrollRes.rows.length === 0 || enrollRes.rows[0].completed_at) return;
    
    const certValid = await canRequestCertificate(courseId, studentId);
    if (!certValid.canRequest) return;
    
    const examValid = await canUnlockExam(courseId, studentId);
    if (!examValid.unlocked) return;

    await pool.query('UPDATE enrollments SET completed_at = CURRENT_TIMESTAMP WHERE id = $1', [enrollRes.rows[0].id]);
    console.log(`Course ${courseId} auto-completed for student ${studentId}`);
  } catch (err) {
    console.error('Error auto-completing course', err);
  }
};

module.exports = {
  canRequestCertificate,
  canUnlockExam,
  checkAndMarkCourseCompletion
};
