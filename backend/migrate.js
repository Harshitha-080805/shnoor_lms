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
