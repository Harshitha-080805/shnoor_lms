const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Running courses fields migration...');
    const query = `
      ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50),
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50),
      ADD COLUMN IF NOT EXISTS learning_outcomes TEXT,
      ADD COLUMN IF NOT EXISTS skills_gained TEXT,
      ADD COLUMN IF NOT EXISTS prerequisites_enabled BOOLEAN DEFAULT FALSE;
    `;
    await pool.query(query);
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
