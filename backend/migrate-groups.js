const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created groups table");

    // 2. Create Group Members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_members (
          id SERIAL PRIMARY KEY,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(group_id, user_id)
      );
    `);
    console.log("Created group_members table");

    // 3. Create Course Groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_groups (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(course_id, group_id)
      );
    `);
    console.log("Created course_groups table");

    // 4. Alter Courses Table
    try {
        await client.query(`ALTER TABLE courses ADD COLUMN assign_all_in_org BOOLEAN DEFAULT TRUE;`);
        console.log("Added assign_all_in_org to courses");
    } catch (err) {
        if (err.code === '42701') { // column already exists
            console.log("Column assign_all_in_org already exists in courses, skipping.");
        } else {
            throw err;
        }
    }

    // 5. Update existing courses
    await client.query(`UPDATE courses SET assign_all_in_org = TRUE WHERE assign_all_in_org IS NULL;`);
    console.log("Updated existing courses to assign_all_in_org = TRUE");

    await client.query('COMMIT');
    console.log("Migration successful");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
