const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixCourses() {
  try {
    const client = await pool.connect();
    
    // Find all courses with organization_id = null
    const coursesRes = await client.query('SELECT c.id, c.title, c.instructor_id, u.organization_id FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.organization_id IS NULL');
    const courses = coursesRes.rows;
    
    console.log(`Found ${courses.length} courses with null organization_id`);
    
    for (const course of courses) {
      if (course.organization_id) {
        await client.query('UPDATE courses SET organization_id = $1 WHERE id = $2', [course.organization_id, course.id]);
        console.log(`Updated course ${course.title} (ID: ${course.id}) to organization_id ${course.organization_id}`);
      } else {
        console.log(`Course ${course.title} (ID: ${course.id}) instructor has no organization_id, leaving as null`);
      }
    }
    
    client.release();
    pool.end();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Error during migration:', err);
  }
}

fixCourses();
