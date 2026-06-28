const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('./db');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = (authMiddleware) => {
  // GET all practice arenas for students
  router.get('/', authMiddleware(), async (req, res) => {
    try {
      if (req.user.role === 'INSTRUCTOR') {
        const result = await pool.query(`
          SELECT pa.*, c.title as target_course_title,
            (SELECT COUNT(*) FROM practice_mcq_questions pmq WHERE pmq.practice_arena_id = pa.id) as mcq_count,
            (SELECT COUNT(*) FROM practice_coding_questions pcq WHERE pcq.practice_arena_id = pa.id) as coding_count
          FROM practice_arenas pa
          LEFT JOIN courses c ON pa.target_course_id = c.id
          WHERE pa.instructor_id = $1 ORDER BY pa.id DESC
        `, [req.user.userId]);
        return res.json(result.rows);
      } else {
        const studentId = req.user.userId;
        const result = await pool.query(`
          SELECT pa.*, u.full_name as instructor_name,
            (SELECT COUNT(*) FROM practice_mcq_questions pmq WHERE pmq.practice_arena_id = pa.id) as mcq_count,
            (SELECT COUNT(*) FROM practice_coding_questions pcq WHERE pcq.practice_arena_id = pa.id) as coding_count
          FROM practice_arenas pa
          LEFT JOIN users u ON pa.instructor_id = u.id
          WHERE
            (
              pa.visibility = 'GLOBAL' 
              AND (
                u.organization_id = (SELECT organization_id FROM users WHERE id = $1) 
                OR (u.organization_id IS NULL AND (SELECT organization_id FROM users WHERE id = $1) IS NULL)
              )
            )
            OR 
            (pa.visibility = 'COURSE_SPECIFIC' AND pa.target_course_id IN (
              SELECT course_id FROM enrollments WHERE student_id = $1
            ))
          ORDER BY pa.id DESC
        `, [studentId]);
        return res.json(result.rows);
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error fetching practice arenas' });
    }
  });
  // GET dashboard stats for student
  router.get('/student/dashboard', authMiddleware(), async (req, res) => {
    const userId = req.user.userId;
    try {
      const statsRes = await pool.query(`
        SELECT 
          COUNT(DISTINCT practice_arena_id) as arenas_attempted,
          ROUND(AVG(total_score)) as avg_score,
          SUM(time_taken_seconds) as total_time_seconds
        FROM practice_arena_attempts
        WHERE student_id = $1
      `, [userId]);

      const recentRes = await pool.query(`
        SELECT paa.*, pa.title, 
               (SELECT COUNT(*) FROM practice_mcq_questions pmq WHERE pmq.practice_arena_id = pa.id) as mcq_count,
               (SELECT COUNT(*) FROM practice_coding_questions pcq WHERE pcq.practice_arena_id = pa.id) as coding_count
        FROM practice_arena_attempts paa
        JOIN practice_arenas pa ON paa.practice_arena_id = pa.id
        WHERE paa.student_id = $1
        ORDER BY paa.attempted_at DESC LIMIT 5
      `, [userId]);

      const lbRes = await pool.query(`
        WITH UserArenaMax AS (
          SELECT student_id, practice_arena_id, MAX(total_score) as max_score
          FROM practice_arena_attempts
          GROUP BY student_id, practice_arena_id
        )
        SELECT u.id, u.full_name, u.profile_pic, SUM(uam.max_score) as total_score
        FROM UserArenaMax uam
        JOIN users u ON uam.student_id = u.id
        GROUP BY u.id, u.full_name, u.profile_pic
        ORDER BY total_score DESC
        LIMIT 10
      `);

      res.json({
        stats: statsRes.rows[0],
        recent: recentRes.rows,
        leaderboard: lbRes.rows
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error fetching student dashboard' });
    }
  });

  // GET practice arena by id
  router.get('/:id', authMiddleware(), async (req, res) => {
    const { id } = req.params;
    try {
      const arenaRes = await pool.query('SELECT * FROM practice_arenas WHERE id = $1', [id]);
      if (arenaRes.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      const arena = arenaRes.rows[0];

      if (req.user && req.user.role !== 'INSTRUCTOR' && arena.visibility === 'COURSE_SPECIFIC') {
        const studentId = req.user.userId;
        const checkEnrolled = await pool.query('SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, arena.target_course_id]);
        if (checkEnrolled.rows.length === 0) {
          return res.status(403).json({ error: 'Forbidden. You are not enrolled in the course required for this practice arena.' });
        }
      }

      // Fetch Quizzes and MCQs
      const mcqRes = await pool.query('SELECT * FROM practice_mcq_questions WHERE practice_arena_id = $1', [arena.id]);
      if (mcqRes.rows.length > 0) {
        arena.quizzes = [{
          id: 'default',
          title: 'General Quiz',
          mcqs: mcqRes.rows
        }];
      } else {
        arena.quizzes = [];
      }

      // Fetch Coding
      const codingRes = await pool.query(`
        SELECT cq.*, 
               (SELECT COUNT(DISTINCT ps.student_id) FROM practice_submissions ps JOIN coding_submissions cs ON ps.id = cs.practice_submission_id WHERE cs.coding_question_id = cq.id AND ps.submission_type = 'CODING') as attempt_count
        FROM practice_coding_questions cq
        WHERE cq.practice_arena_id = $1
      `, [arena.id]);
      arena.coding = codingRes.rows;

      for (let cq of arena.coding) {
        const tcRes = await pool.query('SELECT * FROM practice_test_cases WHERE coding_question_id = $1', [cq.id]);
        if (req.user && req.user.role === 'INSTRUCTOR') {
          cq.test_cases = tcRes.rows;
        } else {
          cq.test_cases = tcRes.rows.map(tc => {
            if (tc.is_hidden) {
              return { id: tc.id, is_hidden: true, input_data: 'Hidden Test Case', expected_output: 'Hidden' };
            }
            return tc;
          });
        }
      }

      if (req.user && (req.user.role === 'STUDENT' || req.user.role === 'LEARNER')) {
        const studentId = req.user.userId;
        const subRes = await pool.query('SELECT * FROM practice_submissions WHERE practice_arena_id = $1 AND student_id = $2 ORDER BY submitted_at DESC', [arena.id, studentId]);
        
        arena.mcq_submissions = subRes.rows.filter(s => s.submission_type === 'MCQ');
        arena.coding_submissions = subRes.rows.filter(s => s.submission_type === 'CODING');

        if (arena.coding_submissions.length > 0) {
          const cSubs = await pool.query('SELECT * FROM coding_submissions WHERE practice_submission_id = ANY($1)', [arena.coding_submissions.map(s => s.id)]);
          arena.coding_submissions.forEach(cs => {
            const details = cSubs.rows.find(r => r.practice_submission_id === cs.id);
            if (details) {
              cs.submitted_code = details.submitted_code;
              cs.coding_question_id = details.coding_question_id;
              cs.passed_test_cases = details.passed_test_cases;
              cs.total_test_cases = details.total_test_cases;
              cs.test_results = details.test_results;
            }
          });
        }
      }

      res.json(arena);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error fetching practice arena' });
    }
  });

  // GET arena leaderboard
  router.get('/:id/leaderboard', authMiddleware(), async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT u.id, u.full_name, u.profile_pic, MAX(paa.total_score) as total_score, MAX(paa.attempted_at) as last_submission
        FROM practice_arena_attempts paa
        JOIN users u ON paa.student_id = u.id
        WHERE paa.practice_arena_id = $1
        GROUP BY u.id, u.full_name, u.profile_pic
        ORDER BY total_score DESC, last_submission ASC
      `, [id]);
      res.json(result.rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error fetching leaderboard' });
    }
  });

  // POST practice arena (Instructor only)
  router.post('/', authMiddleware(['INSTRUCTOR']), async (req, res) => {
    const { title, description, visibility, target_course_id, is_mcq_enabled, is_coding_enabled, time_limit_minutes, difficulty, quizzes, coding } = req.body;
    const instructorId = req.user.userId;

    try {
      await pool.query('BEGIN');
      
      const inserted = await pool.query(
        'INSERT INTO practice_arenas (title, description, visibility, target_course_id, is_mcq_enabled, is_coding_enabled, time_limit_minutes, difficulty, instructor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [title, description, visibility || 'GLOBAL', target_course_id || null, is_mcq_enabled, is_coding_enabled, time_limit_minutes || 60, difficulty || 'Medium', instructorId]
      );
      const arenaId = inserted.rows[0].id;

      // Insert MCQs
      if (quizzes && quizzes.length > 0) {
        for (const q of quizzes) {
          if (q.mcqs && q.mcqs.length > 0) {
            for (const m of q.mcqs) {
              await pool.query(
                `INSERT INTO practice_mcq_questions (practice_arena_id, question, option_a, option_b, option_c, option_d, correct_answer, marks, explanation)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [arenaId, m.question, m.option_a, m.option_b, m.option_c, m.option_d, m.correct_answer, m.marks || 1, m.explanation]
              );
            }
          }
        }
      }

      // Insert Coding
      if (coding && coding.length > 0) {
        for (const c of coding) {
          const cRes = await pool.query(
            `INSERT INTO practice_coding_questions (practice_arena_id, title, problem_statement, difficulty, language, starter_code, marks)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [arenaId, c.title, c.problem_statement, c.difficulty || 'Easy', c.language || 'python', c.starter_code, c.marks || 10]
          );
          const cqId = cRes.rows[0].id;

          if (c.test_cases && c.test_cases.length > 0) {
            for (const tc of c.test_cases) {
              await pool.query(
                `INSERT INTO practice_test_cases (coding_question_id, input_data, expected_output, is_hidden)
                 VALUES ($1, $2, $3, $4)`,
                [cqId, tc.input_data, tc.expected_output, tc.is_hidden || false]
              );
            }
          }
        }
      }

      await pool.query('COMMIT');
      res.json({ message: 'Practice Arena saved successfully', id: arenaId });
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Server error saving practice arena' });
    }
  });

  // PUT practice arena (Instructor only)
  router.put('/:id', authMiddleware(['INSTRUCTOR']), async (req, res) => {
    const { id } = req.params;
    const { title, description, visibility, target_course_id, is_mcq_enabled, is_coding_enabled, time_limit_minutes, difficulty, quizzes, coding } = req.body;
    const instructorId = req.user.userId;

    try {
      const checkRes = await pool.query('SELECT instructor_id FROM practice_arenas WHERE id = $1', [id]);
      if (checkRes.rows.length === 0 || checkRes.rows[0].instructor_id !== instructorId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await pool.query('BEGIN');
      
      await pool.query(
        'UPDATE practice_arenas SET title = $1, description = $2, visibility = $3, target_course_id = $4, is_mcq_enabled = $5, is_coding_enabled = $6, time_limit_minutes = $7, difficulty = $8 WHERE id = $9',
        [title, description, visibility || 'GLOBAL', target_course_id || null, is_mcq_enabled, is_coding_enabled, time_limit_minutes || 60, difficulty || 'Medium', id]
      );

      // Delete existing questions to fully replace
      await pool.query('DELETE FROM practice_mcq_questions WHERE practice_arena_id = $1', [id]);
      await pool.query('DELETE FROM practice_coding_questions WHERE practice_arena_id = $1', [id]);

      // Insert MCQs
      if (quizzes && quizzes.length > 0) {
        for (const q of quizzes) {
          if (q.mcqs && q.mcqs.length > 0) {
            for (const m of q.mcqs) {
              await pool.query(
                `INSERT INTO practice_mcq_questions (practice_arena_id, question, option_a, option_b, option_c, option_d, correct_answer, marks, explanation)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [id, m.question, m.option_a, m.option_b, m.option_c, m.option_d, m.correct_answer, m.marks || 1, m.explanation]
              );
            }
          }
        }
      }

      // Insert Coding
      if (coding && coding.length > 0) {
        for (const c of coding) {
          const cRes = await pool.query(
            `INSERT INTO practice_coding_questions (practice_arena_id, title, problem_statement, difficulty, language, starter_code, marks)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [id, c.title, c.problem_statement, c.difficulty || 'Easy', c.language || 'python', c.starter_code, c.marks || 10]
          );
          const cqId = cRes.rows[0].id;

          if (c.test_cases && c.test_cases.length > 0) {
            for (const tc of c.test_cases) {
              await pool.query(
                `INSERT INTO practice_test_cases (coding_question_id, input_data, expected_output, is_hidden)
                 VALUES ($1, $2, $3, $4)`,
                [cqId, tc.input_data, tc.expected_output, tc.is_hidden || false]
              );
            }
          }
        }
      }

      await pool.query('COMMIT');
      res.json({ message: 'Practice Arena updated successfully' });
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Server error updating practice arena' });
    }
  });

  // DELETE practice arena (Instructor only)
  router.delete('/:id', authMiddleware(['INSTRUCTOR']), async (req, res) => {
    const { id } = req.params;
    const instructorId = req.user.userId;

    try {
      const checkRes = await pool.query('SELECT instructor_id FROM practice_arenas WHERE id = $1', [id]);
      if (checkRes.rows.length === 0 || checkRes.rows[0].instructor_id !== instructorId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await pool.query('DELETE FROM practice_arenas WHERE id = $1', [id]);
      res.json({ message: 'Deleted successfully' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error deleting practice arena' });
    }
  });

  // POST submit code (Piston API Integration)
  router.post('/:arenaId/submit-code', authMiddleware(), async (req, res) => {
    const { arenaId } = req.params;
    const { coding_question_id, code, language, isSubmit = true } = req.body;
    const userId = req.user.userId;

    try {
      const tcRes = await pool.query('SELECT * FROM practice_test_cases WHERE coding_question_id = $1', [coding_question_id]);
      let testCases = tcRes.rows;

      if (!isSubmit) {
        testCases = testCases.filter(tc => !tc.is_hidden);
      }

      if (!testCases || testCases.length === 0) {
        return res.status(400).json({ error: 'No test cases found' });
      }

      const reqLang = language.toLowerCase();
      let executionMode = 'wandbox';
      let compiler = 'cpython-3.12.7'; 
      
      if (reqLang === 'javascript' || reqLang === 'js') {
        compiler = 'nodejs-18.20.4';
      } else if (reqLang === 'python') {
        compiler = 'cpython-3.12.7';
      } else if (reqLang === 'c') {
        compiler = 'clang-15.0.7-c';
      } else if (reqLang === 'c++' || reqLang === 'cpp') {
        compiler = 'clang-15.0.7';
      } else if (reqLang === 'java') {
        compiler = 'openjdk-jdk-22+36';
      } else if (reqLang === 'php') {
        compiler = 'php-7.4.33';
      }

      let passedCount = 0;
      const results = [];

      if (executionMode === 'local') {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-exec-'));
        try {
          let fileName = '';
          let dockerImage = '';
          let compileCmd = null;
          let runCmdTemplate = '';

          if (compiler === 'python') {
            fileName = 'script.py'; dockerImage = 'python:3.9-alpine'; runCmdTemplate = 'python script.py < input_IDX.txt > output_IDX.txt 2> error_IDX.txt';
          } else if (compiler === 'javascript') {
            fileName = 'script.js'; dockerImage = 'node:18-alpine'; runCmdTemplate = 'node script.js < input_IDX.txt > output_IDX.txt 2> error_IDX.txt';
          } else if (compiler === 'c') {
            fileName = 'main.c'; dockerImage = 'gcc:latest'; compileCmd = 'gcc main.c -o out 2> compile_error.txt'; runCmdTemplate = './out < input_IDX.txt > output_IDX.txt 2> error_IDX.txt';
          } else if (compiler === 'cpp') {
            fileName = 'main.cpp'; dockerImage = 'gcc:latest'; compileCmd = 'g++ main.cpp -o out 2> compile_error.txt'; runCmdTemplate = './out < input_IDX.txt > output_IDX.txt 2> error_IDX.txt';
          } else if (compiler === 'java') {
            fileName = 'Main.java'; dockerImage = 'eclipse-temurin:17-jdk'; compileCmd = 'javac Main.java 2> compile_error.txt'; runCmdTemplate = 'java Main < input_IDX.txt > output_IDX.txt 2> error_IDX.txt';
          } else if (compiler === 'php') {
            fileName = 'script.php'; dockerImage = 'php:8.2-cli-alpine'; runCmdTemplate = 'php script.php < input_IDX.txt > output_IDX.txt 2> error_IDX.txt';
          }

          fs.writeFileSync(path.join(tempDir, fileName), code);

          let runScriptContent = '#!/bin/sh\n';
          if (compileCmd) {
            runScriptContent += `${compileCmd}\nif [ $? -ne 0 ]; then exit 1; fi\n`;
          }

          for (let i = 0; i < testCases.length; i++) {
            fs.writeFileSync(path.join(tempDir, `input_${i}.txt`), testCases[i].input_data || "");
            runScriptContent += `${runCmdTemplate.replace(/IDX/g, i)}\n`;
          }
          
          fs.writeFileSync(path.join(tempDir, 'run.sh'), runScriptContent.replace(/\r\n/g, '\n'));

          let systemError = '';
          try {
            cp.execSync(`docker run --rm -v "${tempDir}:/app" -w /app ${dockerImage} sh run.sh`, { encoding: 'utf-8', timeout: 30000 });
          } catch (execErr) {
            systemError = execErr.stdout || execErr.stderr || execErr.message || "";
          }

          let compileError = '';
          if (compileCmd && fs.existsSync(path.join(tempDir, 'compile_error.txt'))) {
            compileError = fs.readFileSync(path.join(tempDir, 'compile_error.txt'), 'utf-8').trim();
          }

          for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            let output = '';

            if (compileError) {
              output = compileError;
            } else {
              const outPath = path.join(tempDir, `output_${i}.txt`);
              const errPath = path.join(tempDir, `error_${i}.txt`);
              
              let outContent = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : null;
              let errContent = fs.existsSync(errPath) ? fs.readFileSync(errPath, 'utf-8') : null;
              
              if (errContent && errContent.trim()) {
                output = errContent;
              } else if (outContent !== null) {
                output = outContent;
              } else if (systemError) {
                output = systemError;
              } else {
                output = "Execution Failed or Timed Out";
              }
            }

            output = output.trim();
            const expected = (tc.expected_output || "").trim();
            const passed = output === expected;
            if (passed) passedCount++;

            results.push({
              test_case_id: tc.id,
              is_hidden: tc.is_hidden,
              passed,
              output: tc.is_hidden ? 'Hidden' : output,
              expected: tc.is_hidden ? 'Hidden' : expected,
              input_data: tc.is_hidden ? 'Hidden' : (tc.input_data || "")
            });
          }
        } finally {
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        }
      } else {
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          try {
            const payload = { compiler: compiler, code: code, stdin: tc.input_data || "" };
            const response = await axios.post('https://wandbox.org/api/compile.json', payload);
            const data = response.data;
            let output = data.program_output || data.compiler_error || data.program_error || "";
            
            output = output.trim();
            const expected = (tc.expected_output || "").trim();
            const passed = output === expected;
            if (passed) passedCount++;

            results.push({
              test_case_id: tc.id,
              is_hidden: tc.is_hidden,
              passed,
              output: tc.is_hidden ? 'Hidden' : output,
              expected: tc.is_hidden ? 'Hidden' : expected,
              input_data: tc.is_hidden ? 'Hidden' : (tc.input_data || "")
            });

          } catch (apiErr) {
            results.push({
              test_case_id: tc.id,
              is_hidden: tc.is_hidden,
              passed: false,
              output: "Execution Error",
              expected: tc.is_hidden ? 'Hidden' : (tc.expected_output || "").trim(),
              input_data: tc.is_hidden ? 'Hidden' : (tc.input_data || "")
            });
          }
        }
      }

      const cqRes = await pool.query('SELECT marks FROM practice_coding_questions WHERE id = $1', [coding_question_id]);
      const maxMarks = cqRes.rows[0]?.marks || 10;
      const score = Math.round((passedCount / testCases.length) * maxMarks);

      if (isSubmit) {
        console.log('DEBUG 526 params:', { userId, arenaId, type: 'CODING', coding_question_id });
        console.log('DEBUG types:', { userId: typeof userId, arenaId: typeof arenaId, coding: typeof coding_question_id });
        const existing = await pool.query(
          'SELECT ps.id FROM practice_submissions ps JOIN coding_submissions cs ON ps.id = cs.practice_submission_id WHERE ps.student_id = $1 AND ps.practice_arena_id = $2 AND ps.submission_type = $3 AND cs.coding_question_id = $4',
          [userId, arenaId, 'CODING', coding_question_id]
        );

        let pSubId;
        if (existing.rows.length > 0) {
          pSubId = existing.rows[0].id;
          await pool.query(
            'UPDATE practice_submissions SET score = $1, status = $2, submitted_at = NOW() WHERE id = $3',
            [score, 'COMPLETED', pSubId]
          );
          await pool.query(
            'UPDATE coding_submissions SET submitted_code = $1, passed_test_cases = $2, total_test_cases = $3, test_results = $4 WHERE practice_submission_id = $5',
            [code, passedCount, testCases.length, JSON.stringify(results), pSubId]
          );
        } else {
          const pSub = await pool.query(
            `INSERT INTO practice_submissions (student_id, practice_arena_id, submission_type, score, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [userId, arenaId, 'CODING', score, 'COMPLETED']
          );
          pSubId = pSub.rows[0].id;
          await pool.query(
            `INSERT INTO coding_submissions (practice_submission_id, coding_question_id, submitted_code, passed_test_cases, total_test_cases, test_results)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [pSubId, coding_question_id, code, passedCount, testCases.length, JSON.stringify(results)]
          );
        }
      }

      res.json({ passedCount, totalCount: testCases.length, results, score, maxMarks });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error executing code' });
    }
  });

  // POST submit mcq
  router.post('/:arenaId/submit-mcq', authMiddleware(), async (req, res) => {
    const { arenaId } = req.params;
    const { quizId, mcqAnswers, score, status = 'COMPLETED', isTryAgain = false } = req.body;
    const userId = req.user.userId;

    try {
      const existing = await pool.query(
        'SELECT id, status FROM practice_submissions WHERE student_id = $1 AND practice_arena_id = $2 AND submission_type = $3',
        [userId, arenaId, 'MCQ']
      );

      if (existing.rows.length > 0) {
        const currentStatus = existing.rows[0].status;
        if (currentStatus === 'COMPLETED' && status === 'IN_PROGRESS' && !isTryAgain) {
          return res.json({ message: 'Ignored auto-save' });
        }
        await pool.query(
          'UPDATE practice_submissions SET score = $1, status = $2, submitted_at = NOW() WHERE student_id = $3 AND practice_arena_id = $4 AND submission_type = $5',
          [score, 'COMPLETED', userId, arenaId, 'MCQ']
        );
      } else {
        await pool.query(
          `INSERT INTO practice_submissions (student_id, practice_arena_id, submission_type, score, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, arenaId, 'MCQ', score, 'COMPLETED']
        );
      }
      res.json({ message: 'MCQ answers saved' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error saving MCQ' });
    }
  });

  // POST finish attempt
  router.post('/:arenaId/finish-attempt', authMiddleware(), async (req, res) => {
    const { arenaId } = req.params;
    const { total_score, time_taken_seconds } = req.body;
    const userId = req.user.userId;

    try {
      await pool.query(
        'INSERT INTO practice_arena_attempts (student_id, practice_arena_id, total_score, time_taken_seconds) VALUES ($1, $2, $3, $4)',
        [userId, arenaId, total_score, time_taken_seconds]
      );
      res.json({ message: 'Attempt saved' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error saving attempt' });
    }
  });

  return router;
};
