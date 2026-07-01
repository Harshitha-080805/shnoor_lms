const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const orgAdmins = await pool.query("SELECT id, full_name, role, organization_id FROM users WHERE role = 'ORGANIZATION_ADMIN'");
    console.log('Org Admins:', orgAdmins.rows);
    
    const instructors = await pool.query("SELECT id, full_name, role, organization_id FROM users WHERE role = 'INSTRUCTOR'");
    console.log('Instructors:', instructors.rows);

    const groups = await pool.query("SELECT * FROM groups");
    console.log('Groups:', groups.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
