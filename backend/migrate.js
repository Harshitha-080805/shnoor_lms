const pool = require('./db');

const runMigration = async () => {
  try {
    // Drop the old incorrectly structured table if it exists
    await pool.query('DROP TABLE IF EXISTS course_prerequisites CASCADE');

    const query = `
      CREATE TABLE course_prerequisites (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          minimum_completion_percentage INTEGER DEFAULT 0,
          minimum_quiz_score INTEGER DEFAULT 0,
          certificate_required BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(course_id, prerequisite_course_id)
      );
    `;
    await pool.query(query);
    console.log("Migration successful: course_prerequisites table created.");

    // Add missing columns to courses table
    await pool.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100),
      ADD COLUMN IF NOT EXISTS learning_outcomes TEXT,
      ADD COLUMN IF NOT EXISTS skills_gained TEXT,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50),
      ADD COLUMN IF NOT EXISTS prerequisites_enabled BOOLEAN DEFAULT FALSE;
    `);
    console.log("Migration successful: added new columns to courses table.");

    // Add missing vtt_file column to lessons table
    await pool.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS vtt_file VARCHAR(255);
    `);
    console.log("Migration successful: added vtt_file to lessons table.");

    // Create course exams tables
    const fs = require('fs');
    const path = require('path');
    const courseExamsSql = fs.readFileSync(path.join(__dirname, 'database', 'course_exams.sql'), 'utf8');
    await pool.query(courseExamsSql);
    console.log("Migration successful: course_exams tables created.");

    // Add missing is_deleted columns to course exam tables
    // Add missing is_deleted columns to course exam tables
    await pool.query(`
      ALTER TABLE course_exam_sections ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
      ALTER TABLE course_exam_questions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    `);
    console.log("Migration successful: added is_deleted columns to exam tables.");

    // Add missing exam version columns
    await pool.query(`
      ALTER TABLE course_exams ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
      ALTER TABLE course_exam_attempts ADD COLUMN IF NOT EXISTS exam_version INTEGER DEFAULT 1;
      ALTER TABLE course_exam_attempts ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
      ALTER TABLE course_exam_attempts ADD COLUMN IF NOT EXISTS auto_score INTEGER DEFAULT 0;
      ALTER TABLE course_exam_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
    `);
    console.log("Migration successful: added version columns to exam tables.");
    console.log("Migration successful: added is_deleted columns to exam tables.");


    // Add missing columns to announcements
    await pool.query(`
      ALTER TABLE announcements 
      ADD COLUMN IF NOT EXISTS author_role VARCHAR(50),
      ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log("Migration successful: added author columns to announcements.");

    // Add password reset columns to users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;
    `);
    console.log("Migration successful: added password reset columns to users.");

    // Create user_hidden_announcements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_hidden_announcements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, announcement_id)
      );
    `);
    console.log("Migration successful: created user_hidden_announcements table.");

    // Add ANNOUNCEMENT to conversation_type enum if it doesn't exist
    try {
      await pool.query("ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT'");
      console.log("Migration successful: ANNOUNCEMENT added to conversation_type enum.");
    } catch (e) {
      console.log("Notice with enum:", e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
