const pool = require('./db');

const runMigration = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS course_prerequisites (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          prerequisite_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          is_required_completion BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(course_id, prerequisite_id)
      );
    `;
    await pool.query(query);
    console.log("Migration successful: course_prerequisites table created.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
