const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    // Add columns to courses table
    await pool.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100),
      ADD COLUMN IF NOT EXISTS learning_outcomes TEXT,
      ADD COLUMN IF NOT EXISTS skills_gained TEXT,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50),
      ADD COLUMN IF NOT EXISTS prerequisites_enabled BOOLEAN DEFAULT false;
    `);
    console.log('Courses table altered successfully');

    // Add columns to course_prerequisites table
    await pool.query(`
      ALTER TABLE course_prerequisites
      ADD COLUMN IF NOT EXISTS minimum_completion_percentage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS minimum_quiz_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS certificate_required BOOLEAN DEFAULT false;
    `);
    console.log('Course_prerequisites table altered successfully');

  } catch (err) {
    console.error('Error in migration:', err);
  } finally {
    await pool.end();
  }
}

migrate();
