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

    // Create course_exam_answers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_exam_answers (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER NOT NULL REFERENCES course_exam_attempts(id) ON DELETE CASCADE,
          question_id INTEGER NOT NULL REFERENCES course_exam_questions(id) ON DELETE CASCADE,
          answer_text TEXT,
          score INTEGER DEFAULT 0,
          is_correct BOOLEAN DEFAULT false,
          review_status VARCHAR(50) DEFAULT 'PENDING',
          feedback TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Migration successful: course_exam_answers table created.");


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
