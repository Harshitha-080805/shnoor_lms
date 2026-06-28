const express = require('express');
const {
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
} = require('./examController');

module.exports = (authMiddleware) => {
  const router = express.Router();

  // Instructor Routes
  router.post('/courses/:courseId', authMiddleware(['INSTRUCTOR']), createExam);
  router.get('/courses/:courseId', authMiddleware(['INSTRUCTOR']), getCourseExams);
  router.delete('/:examId', authMiddleware(['INSTRUCTOR']), deleteExam);
  router.put('/:examId/settings', authMiddleware(['INSTRUCTOR']), updateExamSettings);
  router.post('/:examId/publish', authMiddleware(['INSTRUCTOR']), publishExam);
  router.get('/review/pending', authMiddleware(['INSTRUCTOR']), getReviewPending);
  router.post('/review/:answerId', authMiddleware(['INSTRUCTOR']), submitExamReview);
  router.get('/:examId/attempts', authMiddleware(['INSTRUCTOR']), getExamAttemptsList);
  
  // Builder Routes
  router.get('/:examId/builder', authMiddleware(['INSTRUCTOR']), getExamBuilder);
  router.post('/:examId/sections', authMiddleware(['INSTRUCTOR']), addExamSection);
  router.post('/sections/:sectionId/questions', authMiddleware(['INSTRUCTOR']), addExamQuestion);
  router.delete('/questions/:questionId', authMiddleware(['INSTRUCTOR']), deleteExamQuestion);

  // Student Routes
  router.get('/student/available', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), getAvailableExams);
  router.get('/student/courses/:courseId', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), getStudentCourseExam);
  router.get('/:examId/preview', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), getExamPreview);
  router.post('/:examId/start', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), startAttempt);
  router.get('/attempts/:attemptId/data', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), getExamAttemptData);
  router.post('/attempts/:attemptId/submit', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), submitExamAttempt);
  router.post('/execute-code', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE']), executeStudentCode);

  // Common Routes (Instructor/Student)
  router.get('/attempts/:attemptId/review', authMiddleware(['LEARNER', 'STUDENT', 'EMPLOYEE', 'INSTRUCTOR']), getDetailedAttemptReview);

  return router;
};
